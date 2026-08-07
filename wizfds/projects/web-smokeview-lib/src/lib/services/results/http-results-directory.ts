import { ResultFileHandle, ResultsDirectory } from './results-directory';

/**
 * A results directory served over HTTP, read with byte ranges.
 *
 * `fetch` rather than Angular's HTTP client on purpose: the library draws and
 * decodes, it does not take a dependency on the app's HTTP stack (ADR-0010),
 * and ranges of raw bytes are exactly what `fetch` is comfortable with.
 *
 * Every request is a range request, including the probe - a `GET` with
 * `Range: bytes=0-0` costs one byte and answers two questions at once: how big
 * the file is, and whether this server honours ranges at all. That second
 * answer matters enough to fail on: a server that quietly ignores `Range`
 * would have the Phase 6 readers downloading a whole 500 MB slice file to look
 * at one frame of it, and the only symptom would be that everything got slow.
 */
export class HttpResultsDirectory implements ResultsDirectory {

  /** The case directory, without a trailing `/`. */
  constructor(private readonly baseUrl: string) { }

  public async open(filename: string): Promise<ResultFileHandle | null> {
    const url = this.urlFor(filename);
    const response = await fetch(url, { headers: { Range: 'bytes=0-0' } });

    if (response.status === 404) { return null; }

    // No first byte to give, at offset zero, means the file is there and empty
    // - which an interrupted run leaves behind often enough to be worth telling
    // apart from a server that cannot do ranges at all. A server that has
    // bytes and still refuses the first one is not saying that, though: it is
    // a server whose ranges cannot be trusted, and handing its size upwards
    // would send the Phase 6 readers seeking through a file they will never be
    // allowed to read.
    if (response.status === 416) {
      const unsatisfied = unsatisfiedLength(response.headers.get('Content-Range'));
      if (unsatisfied !== null && unsatisfied > 0) {
        throw new Error(`${url}: 416 for bytes=0-0 on ${unsatisfied} bytes - the server's ranges cannot be trusted`);
      }
      return new HttpFileHandle(url, 0);
    }

    if (response.status !== 206) {
      // A 200 here means the whole file is already on its way; drop it rather
      // than let it finish arriving just to be thrown away.
      response.body?.cancel().catch(() => undefined);
      throw new Error(`${url}: expected 206 for a range request, got ${response.status} - the server ignores Range`);
    }

    const size = totalLength(response.headers.get('Content-Range'));
    if (size === null) {
      throw new Error(`${url}: no usable Content-Range on a 206, so the file size is unknown`);
    }

    return new HttpFileHandle(url, size);
  }

  /**
   * Result filenames come out of the `.smv` already separated by `/`, so the
   * separators stay and each segment is escaped on its own - FDS is happy to
   * write a CHID with characters a URL is not.
   */
  private urlFor(filename: string): string {
    const path = filename
      .split('/')
      .filter(segment => segment.length > 0)
      .map(segment => encodeURIComponent(segment))
      .join('/');
    return `${this.baseUrl}/${path}`;
  }
}

/** `bytes 0-0/12345` - what matters is the total after the slash. */
function totalLength(contentRange: string | null): number | null {
  const match = /^bytes \d+-\d+\/(\d+)$/.exec((contentRange ?? '').trim());
  return match === null ? null : Number(match[1]);
}

/**
 * The same total, spelled the way a 416 spells it: a star where the satisfied
 * range would be, because none was. Servers are only told they *should* send
 * it, so silence here is not a contradiction - it is just no answer.
 */
function unsatisfiedLength(contentRange: string | null): number | null {
  const match = /^bytes \*\/(\d+)$/.exec((contentRange ?? '').trim());
  return match === null ? null : Number(match[1]);
}

class HttpFileHandle implements ResultFileHandle {

  constructor(
    private readonly url: string,
    public readonly size: number
  ) { }

  public async read(offset: number, length: number): Promise<ArrayBuffer> {
    // An empty file is a real thing - an interrupted run leaves them behind -
    // and reading none of one has to be as ordinary as reading none of a big
    // one. There is no range that says so, though: ranges are inclusive, so
    // asking for zero bytes would spell `bytes=0--1`, which is not a range at
    // all. Answer it here rather than let the server puzzle over it.
    if (length === 0) { return new ArrayBuffer(0); }

    // HTTP ranges are inclusive at both ends, unlike every offset/length pair
    // above this line.
    const range = `bytes=${offset}-${offset + length - 1}`;
    const response = await fetch(this.url, { headers: { Range: range } });

    if (response.status !== 206) {
      // A 200 is the whole file on its way for a few bytes' worth of question;
      // drop it rather than let it finish arriving just to be thrown away.
      response.body?.cancel().catch(() => undefined);
      throw new Error(`${this.url}: expected 206 for ${range}, got ${response.status}`);
    }

    return response.arrayBuffer();
  }
}
