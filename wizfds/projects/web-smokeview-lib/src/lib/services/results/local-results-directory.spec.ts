import { LocalResultsDirectory } from './local-results-directory';

// The handles are faked as plain objects: what is under test is the walk down
// the path and the mapping of the file system's several ways of saying "not
// there" onto the single `null` of the contract, and a real picker cannot be
// driven from a spec runner anyway.
describe('LocalResultsDirectory', () => {

  interface FakeTree { [name: string]: Uint8Array | FakeTree }

  const notFound = () => new DOMException('no such entry', 'NotFoundError');
  const typeMismatch = () => new DOMException('wrong kind of entry', 'TypeMismatchError');

  const fileHandle = (name: string, bytes: Uint8Array): FileSystemFileHandle => ({
    kind: 'file',
    name,
    getFile: () => Promise.resolve(new File([bytes], name))
  } as unknown as FileSystemFileHandle);

  const directoryHandle = (tree: FakeTree, name = 'demo'): FileSystemDirectoryHandle => ({
    kind: 'directory',
    name,
    getDirectoryHandle: (entryName: string) => {
      const entry = tree[entryName];
      if (entry === undefined) { return Promise.reject(notFound()); }
      if (entry instanceof Uint8Array) { return Promise.reject(typeMismatch()); }
      return Promise.resolve(directoryHandle(entry, entryName));
    },
    getFileHandle: (entryName: string) => {
      if (entryName.includes('/')) {
        // What the WHATWG spec does before it touches the disk, and the reason
        // the walk exists at all.
        return Promise.reject(new TypeError('name contains a path separator'));
      }
      const entry = tree[entryName];
      if (entry === undefined) { return Promise.reject(notFound()); }
      if (!(entry instanceof Uint8Array)) { return Promise.reject(typeMismatch()); }
      return Promise.resolve(fileHandle(entryName, entry));
    }
  } as unknown as FileSystemDirectoryHandle);

  const pickedFile = (relativePath: string, bytes: Uint8Array): File => {
    const file = new File([bytes], relativePath.split('/').pop());
    // webkitRelativePath is a getter on File.prototype that only a directory
    // input ever fills in; an own property shadows it for the spec.
    Object.defineProperty(file, 'webkitRelativePath', { value: relativePath });
    return file;
  };

  describe('over a directory handle', () => {

    it('opens a file in the root of the picked directory and reports its size', async () => {
      const directory = new LocalResultsDirectory(directoryHandle({
        'demo_01.sf': new Uint8Array([0, 1, 2, 3, 4, 5])
      }));

      const handle = await directory.open('demo_01.sf');

      expect(handle).not.toBeNull();
      expect(handle.size).toBe(6);
    });

    it('answers null for a file the .smv lists but the run never wrote', async () => {
      const directory = new LocalResultsDirectory(directoryHandle({
        'demo_01.sf': new Uint8Array([0])
      }));

      expect(await directory.open('demo_02.sf')).toBeNull();
    });

    it('walks a nested path directory by directory, never asking for a name with a separator', async () => {
      const root = directoryHandle({
        sub: { 'demo_01.sf': new Uint8Array([7, 7, 7]) }
      });
      const askedRootForAFile = spyOn(root, 'getFileHandle').and.callThrough();
      const askedRootForADirectory = spyOn(root, 'getDirectoryHandle').and.callThrough();

      const handle = await new LocalResultsDirectory(root).open('sub/demo_01.sf');

      expect(handle).not.toBeNull();
      expect(handle.size).toBe(3);
      expect(askedRootForADirectory).toHaveBeenCalledWith('sub');
      // the file is asked of the subdirectory, so the root never sees the path
      expect(askedRootForAFile).not.toHaveBeenCalled();
    });

    it('takes a fresh File for every read, because the old one is a snapshot', async () => {
      const bytes = new Uint8Array([0, 1, 2, 3, 4, 5]);
      const file = fileHandle('demo_01.sf', bytes);
      const getFile = spyOn(file, 'getFile').and.callThrough();
      const root = directoryHandle({});
      spyOn(root, 'getFileHandle').and.returnValue(Promise.resolve(file));

      const handle = await new LocalResultsDirectory(root).open('demo_01.sf');
      await handle.read(0, 2);
      await handle.read(2, 2);

      // once to size the file at open(), once per read
      expect(getFile.calls.count()).toBe(3);
    });

    it('reads exactly the requested slice', async () => {
      const directory = new LocalResultsDirectory(directoryHandle({
        'demo_01.sf': new Uint8Array([10, 11, 12, 13, 14, 15])
      }));

      const handle = await directory.open('demo_01.sf');
      const bytes = new Uint8Array(await handle.read(2, 3));

      expect(Array.from(bytes)).toEqual([12, 13, 14]);
    });
  });

  describe('over a directory input', () => {

    it('drops the picked directory from the front of webkitRelativePath', async () => {
      const directory = LocalResultsDirectory.fromFiles([
        pickedFile('demo/demo.smv', new Uint8Array([1])),
        pickedFile('demo/sub/demo_01.sf', new Uint8Array([1, 2, 3]))
      ]);

      expect(await directory.open('demo.smv')).not.toBeNull();
      expect((await directory.open('sub/demo_01.sf')).size).toBe(3);
      // the path as the browser spelled it is not the path the .smv uses
      expect(await directory.open('demo/demo.smv')).toBeNull();
    });

    it('falls back to the plain name when the browser filled in no relative path', async () => {
      // Files picked one by one, rather than as a directory, carry an empty
      // webkitRelativePath - so the flat names are all there is to go by.
      const directory = LocalResultsDirectory.fromFiles([
        new File([new Uint8Array([1, 2, 3])], 'demo_01.sf')
      ]);

      expect((await directory.open('demo_01.sf')).size).toBe(3);
    });

    it('reads exactly the requested slice', async () => {
      const directory = LocalResultsDirectory.fromFiles([
        pickedFile('demo/demo_01.sf', new Uint8Array([10, 11, 12, 13, 14, 15]))
      ]);

      const handle = await directory.open('demo_01.sf');
      const bytes = new Uint8Array(await handle.read(4, 2));

      expect(Array.from(bytes)).toEqual([14, 15]);
    });
  });
});
