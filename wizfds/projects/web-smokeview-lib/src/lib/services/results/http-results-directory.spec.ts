import { HttpResultsDirectory } from './http-results-directory';

// fetch is the only thing this class talks to, so the spec is entirely about
// the shape of the exchange: what goes out in the Range header, and what is
// made of the status and the Content-Range that come back.
describe('HttpResultsDirectory', () => {

  const baseUrl = 'http://localhost:3000/api/results/demo';

  const answerWith = (response: Response) =>
    spyOn(window, 'fetch').and.callFake(() => Promise.resolve(response));

  const rangeHeaderOf = (init: RequestInit): string => (init.headers as Record<string, string>).Range;

  describe('open', () => {

    it('probes with a one-byte range and takes the whole-file size from Content-Range', async () => {
      const fetchSpy = answerWith(new Response(new Uint8Array([0]), {
        status: 206,
        headers: { 'Content-Range': 'bytes 0-0/12345' }
      }));

      const handle = await new HttpResultsDirectory(baseUrl).open('demo_01.sf');

      expect(handle.size).toBe(12345);
      const [url, init] = fetchSpy.calls.mostRecent().args;
      expect(String(url)).toBe('http://localhost:3000/api/results/demo/demo_01.sf');
      expect(rangeHeaderOf(init)).toBe('bytes=0-0');
    });

    it('escapes each path segment and keeps the separators', async () => {
      const fetchSpy = answerWith(new Response(new Uint8Array([0]), {
        status: 206,
        headers: { 'Content-Range': 'bytes 0-0/1' }
      }));

      await new HttpResultsDirectory(baseUrl).open('sub dir/demo 01.sf');

      expect(String(fetchSpy.calls.mostRecent().args[0]))
        .toBe('http://localhost:3000/api/results/demo/sub%20dir/demo%2001.sf');
    });

    it('answers null for a file the .smv lists but the server does not have', async () => {
      answerWith(new Response(null, { status: 404 }));

      expect(await new HttpResultsDirectory(baseUrl).open('demo_02.sf')).toBeNull();
    });

    it('reads a 416 as the empty file an interrupted run left behind, not as a broken server', async () => {
      answerWith(new Response(null, { status: 416 }));

      const handle = await new HttpResultsDirectory(baseUrl).open('demo_01.sf');

      expect(handle).not.toBeNull();
      expect(handle.size).toBe(0);
    });

    it('fails on a 416 that reports bytes, because then the refusal is the server, not the file', async () => {
      answerWith(new Response(null, {
        status: 416,
        headers: { 'Content-Range': 'bytes */64' }
      }));

      await expectAsync(new HttpResultsDirectory(baseUrl).open('demo_01.sf'))
        .toBeRejectedWithError(/cannot be trusted/);
    });

    it('fails on a 200, because that is a server that ignored the range', async () => {
      answerWith(new Response(new Uint8Array([0, 1, 2]), { status: 200 }));

      await expectAsync(new HttpResultsDirectory(baseUrl).open('demo_01.sf'))
        .toBeRejectedWithError(/ignores Range/);
    });

    it('fails on a 206 without a usable Content-Range, since the size is then unknown', async () => {
      answerWith(new Response(new Uint8Array([0]), {
        status: 206,
        headers: { 'Content-Range': 'bytes 0-0/*' }
      }));

      await expectAsync(new HttpResultsDirectory(baseUrl).open('demo_01.sf'))
        .toBeRejectedWithError(/Content-Range/);
    });
  });

  describe('read', () => {

    const openedHandle = async () => {
      const fetchSpy = answerWith(new Response(new Uint8Array([0]), {
        status: 206,
        headers: { 'Content-Range': 'bytes 0-0/64' }
      }));
      const handle = await new HttpResultsDirectory(baseUrl).open('demo_01.sf');
      return { handle, fetchSpy };
    };

    it('asks for an inclusive byte range and hands back the bytes', async () => {
      const { handle, fetchSpy } = await openedHandle();
      fetchSpy.and.callFake(() =>
        Promise.resolve(new Response(new Uint8Array([10, 11, 12, 13]), {
          status: 206,
          headers: { 'Content-Range': 'bytes 10-13/64' }
        })));

      const bytes = new Uint8Array(await handle.read(10, 4));

      expect(Array.from(bytes)).toEqual([10, 11, 12, 13]);
      expect(rangeHeaderOf(fetchSpy.calls.mostRecent().args[1])).toBe('bytes=10-13');
    });

    it('reads zero bytes without asking, since no range can spell an empty one', async () => {
      const { handle, fetchSpy } = await openedHandle();
      const requests = fetchSpy.calls.count();

      expect((await handle.read(0, 0)).byteLength).toBe(0);

      expect(fetchSpy.calls.count()).toBe(requests);
    });

    it('fails on a 200, rather than mistake a whole file for the slice it asked for', async () => {
      const { handle, fetchSpy } = await openedHandle();
      fetchSpy.and.callFake(() => Promise.resolve(new Response(new Uint8Array(64), { status: 200 })));

      await expectAsync(handle.read(10, 4)).toBeRejectedWithError(/expected 206/);
    });

    it('drops the body of an answer it refuses, instead of leaving a whole file arriving', async () => {
      const { handle, fetchSpy } = await openedHandle();
      const whole = new Response(new Uint8Array(64), { status: 200 });
      const cancelled = spyOn(whole.body, 'cancel').and.returnValue(Promise.resolve());
      fetchSpy.and.callFake(() => Promise.resolve(whole));

      await expectAsync(handle.read(10, 4)).toBeRejected();

      expect(cancelled).toHaveBeenCalled();
    });
  });
});
