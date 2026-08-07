import { ResultFileHandle, ResultsDirectory } from './results-directory';

/**
 * A results directory sitting on the user's own disk.
 *
 * There are two ways in because the File System Access API is Chromium-only:
 * the `FileSystemDirectoryHandle` that `showDirectoryPicker()` hands back, and
 * - everywhere else - the flat list of files an `<input type="file"
 * webkitdirectory>` produces, via `fromFiles()`. Both answer the same
 * `open()`, so nothing above this class has to care which browser the user
 * brought.
 *
 * The difference that survives is depth: a handle can walk into subdirectories
 * on demand, a file list is a fixed snapshot of whatever the user picked.
 */
export class LocalResultsDirectory implements ResultsDirectory {

  /**
   * The picked directory, or the relative-path map `fromFiles()` built. One
   * class over a union rather than two classes: only the lookup differs, and
   * the slicing in `read()` - the part with the sharp edge - is the same
   * either way, so a second copy of it is exactly what would drift.
   */
  constructor(private readonly source: FileSystemDirectoryHandle | ReadonlyMap<string, File>) { }

  /**
   * Rebuilds the directory from what `<input type="file" webkitdirectory>`
   * collected. `webkitRelativePath` leads with the name of the directory the
   * user picked (MDN's example: `PhotoAlbums/Birthdays/.../PIC2343.jpg`), while
   * the `.smv` names its files relative to the case directory itself - so that
   * first segment comes off, and the two spellings line up again.
   */
  public static fromFiles(files: FileList | readonly File[]): LocalResultsDirectory {
    const byPath = new Map<string, File>();

    for (const file of Array.from(files)) {
      const relative = file.webkitRelativePath
        ? file.webkitRelativePath.split('/').slice(1).join('/')
        : file.name;
      if (relative) { byPath.set(relative, file); }
    }

    return new LocalResultsDirectory(byPath);
  }

  public async open(filename: string): Promise<ResultFileHandle | null> {
    const found = isFileMap(this.source)
      ? this.source.get(filename) ?? null
      : await walkTo(this.source, filename);

    if (found === null) { return null; }

    const size = found instanceof File ? found.size : (await found.getFile()).size;
    return new LocalFileHandle(found, size);
  }
}

function isFileMap(source: FileSystemDirectoryHandle | ReadonlyMap<string, File>): source is ReadonlyMap<string, File> {
  return source instanceof Map;
}

/**
 * Walks the path a segment at a time. `getFileHandle()` rejects with a
 * `TypeError` on any name carrying a `/` - the spec makes it fail before it
 * ever touches the disk - so directories go through `getDirectoryHandle()` and
 * only the last segment is asked for as a file.
 */
async function walkTo(root: FileSystemDirectoryHandle, filename: string): Promise<FileSystemFileHandle | null> {
  const segments = filename.split('/').filter(segment => segment.length > 0);
  if (segments.length === 0) { return null; }

  try {
    let directory = root;
    for (const segment of segments.slice(0, -1)) {
      directory = await directory.getDirectoryHandle(segment);
    }
    return await directory.getFileHandle(segments[segments.length - 1]);
  } catch (error) {
    if (meansAbsent(error)) { return null; }
    throw error;
  }
}

/**
 * The three ways the file system says "not that, not here": a name it refuses
 * to even look up, nothing under that name, and a directory where a file was
 * asked for. All three are the `null` of the contract. A `NotAllowedError` is
 * not among them - a revoked permission is a real failure and keeps travelling.
 */
function meansAbsent(error: unknown): boolean {
  if (error instanceof TypeError) { return true; }
  return error instanceof DOMException
    && (error.name === 'NotFoundError' || error.name === 'TypeMismatchError');
}

class LocalFileHandle implements ResultFileHandle {

  constructor(
    private readonly source: FileSystemFileHandle | File,
    public readonly size: number
  ) { }

  public async read(offset: number, length: number): Promise<ArrayBuffer> {
    // A `File` is a snapshot: once the file on disk moves under it, the old
    // one stops being readable. So a handle-backed read takes a fresh one every
    // time. A file list has nothing to refresh from - the snapshot is all the
    // browser ever gave us.
    const file = this.source instanceof File ? this.source : await this.source.getFile();
    return file.slice(offset, offset + length).arrayBuffer();
  }
}
