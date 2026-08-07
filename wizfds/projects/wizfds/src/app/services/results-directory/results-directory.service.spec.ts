import { TestBed } from '@angular/core/testing';

import { ResultsDirectoryService } from './results-directory.service';
import { MainService } from '@services/main/main.service';
import { FdsScenario } from '@services/fds-scenario/fds-scenario';
import { appServiceProviders } from '../../../testing/app-service-testing';
import { smvFixture } from '../../../../../web-smokeview-lib/src/lib/services/parsers/smv/smv.fixture';
import { SmvResultFile } from '../../../../../web-smokeview-lib/src/lib/services/parsers/smv/smv-file';

/**
 * The folder of FDS results a scenario was pointed at (#148).
 *
 * The picker and the permissions cannot be driven from a spec runner, so the
 * handles are faked as plain objects - what is under test is everything around
 * them: which `.smv` a folder's contents pick out, what a scan does with what
 * it finds, and that none of it survives the scenario it was picked for.
 *
 * Nothing here touches the browser's own IndexedDB. That store outlives a spec
 * run, so a handle written by one spec would be waiting for the next.
 */
describe('ResultsDirectoryService', () => {

  /** A folder: text for the `.smv`, a byte count for everything else. */
  interface FakeFolder { [name: string]: string | number }

  let service: ResultsDirectoryService;
  let mainService: MainService;
  let remembered: jasmine.Spy;
  let recalled: jasmine.Spy;
  let restorePicker: (() => void) | null;

  const bytesOf = (entry: string | number) => typeof entry === 'number'
    ? new Uint8Array(entry)
    : new TextEncoder().encode(entry);

  function scenario(chid: string, id = 1): FdsScenario {
    return new FdsScenario(JSON.stringify({
      id: id, projectId: 1, name: 'results',
      fdsObject: { general: { head: { chid: chid } } }
    }));
  }

  /** A picked directory, as far as the results directory ever asks. */
  function handleFor(
    name: string,
    folder: FakeFolder,
    permissions: { query?: PermissionState, request?: PermissionState } = {}
  ): FileSystemDirectoryHandle {
    return {
      kind: 'directory',
      name: name,
      values: async function* () {
        for (const entryName of Object.keys(folder)) {
          yield { kind: 'file', name: entryName };
        }
      },
      getDirectoryHandle: () => Promise.reject(new DOMException('no such entry', 'NotFoundError')),
      getFileHandle: (entryName: string) => {
        const entry = folder[entryName];
        if (entry === undefined) {
          return Promise.reject(new DOMException('no such entry', 'NotFoundError'));
        }
        return Promise.resolve({
          kind: 'file',
          name: entryName,
          getFile: () => Promise.resolve(new File([bytesOf(entry)], entryName))
        } as unknown as FileSystemFileHandle);
      },
      queryPermission: () => Promise.resolve(permissions.query ?? 'granted'),
      requestPermission: () => Promise.resolve(permissions.request ?? 'granted')
    } as unknown as FileSystemDirectoryHandle;
  }

  /**
   * What a directory input hands over: flat files, each carrying the picked
   * folder at the front of its relative path (MDN).
   */
  function filesFrom(folder: string, contents: FakeFolder): File[] {
    return Object.keys(contents).map(name => {
      const file = new File([bytesOf(contents[name])], name.split('/').pop());
      // Only a directory input fills this in; an own property shadows the
      // getter on File.prototype for the spec.
      Object.defineProperty(file, 'webkitRelativePath', { value: `${folder}/${name}` });
      return file;
    });
  }

  /** A folder holding one full case, as the fixture `.smv` describes it. */
  function caseFolder(masterName: string, sizes: FakeFolder = {}): FakeFolder {
    return Object.assign({ [masterName]: smvFixture() }, sizes);
  }

  /** Put a picker in front of the service, and take it away afterwards. */
  function stubPicker(open: () => Promise<FileSystemDirectoryHandle>): void {
    const target = window as any;
    const had = 'showDirectoryPicker' in target;
    const original = target.showDirectoryPicker;

    Object.defineProperty(target, 'showDirectoryPicker',
      { value: open, configurable: true, writable: true });
    restorePicker = () => {
      if (had) {
        Object.defineProperty(target, 'showDirectoryPicker',
          { value: original, configurable: true, writable: true });
      } else {
        delete target.showDirectoryPicker;
      }
    };
  }

  /**
   * Turns the event loop until `done` holds. Reading a file takes more than
   * one turn of it, so waiting a fixed number of ticks would be guesswork.
   */
  async function until(done: () => boolean): Promise<void> {
    for (let turn = 0; turn < 100 && !done(); turn++) {
      await new Promise(resolve => setTimeout(resolve));
    }
  }

  /** Enter a scenario, and let whatever it restores finish. */
  async function enter(chid: string, id = 1): Promise<void> {
    mainService.setCurrentFdsScenario(scenario(chid, id));
    await new Promise(resolve => setTimeout(resolve));
  }

  /** The catalog entry for one file of the fixture case. */
  function fileNamed(filename: string): SmvResultFile {
    for (const format of service.catalog.formats) {
      for (const group of format.groups) {
        const found = group.files.find(entry => entry.filename === filename);
        if (found) { return found; }
      }
    }
    return undefined;
  }

  beforeEach(() => {
    restorePicker = null;
    TestBed.configureTestingModule({ providers: appServiceProviders() });

    mainService = TestBed.inject(MainService);
    service = TestBed.inject(ResultsDirectoryService);
  });

  afterEach(() => {
    if (restorePicker) { restorePicker(); }
  });

  describe('with the handle store standing in', () => {

    beforeEach(async () => {
      recalled = spyOn<any>(service, 'recallHandle').and.returnValue(Promise.resolve(null));
      remembered = spyOn<any>(service, 'rememberHandle').and.returnValue(Promise.resolve());
      spyOn<any>(service, 'forgetHandle').and.returnValue(Promise.resolve());
      await enter('demo');
    });

    it('starts with nothing open', () => {
      expect(service.status).toBe('closed');
      expect(service.catalog).toBeNull();
    });

    describe('finding the case in the folder', () => {
      // The rule settled on in #148: one master file is the case whatever it
      // is called, several are decided by the scenario's own CHID, and failing
      // that only the user can say.

      it('takes the only .smv there is, and lists what it names', async () => {
        await service.openFiles(filesFrom('demo', caseFolder('demo.smv')));

        expect(service.status).toBe('open');
        expect(service.message).toBe('');
        expect(service.catalog.smvName).toBe('demo.smv');
        expect(service.catalog.chid).toBe('demo');
        expect(service.name).toBe('demo');
        expect(service.catalog.formats.map(format => format.kind))
          .toEqual(['slcf', 'bndf', 'prt5', 'smoke3d', 'isof']);
        expect(service.catalog.formats[0].groups.map(group => group.label))
          .toEqual(['TEMPERATURE, J=1', 'HRRPUV, K=1 (cell)']);
      });

      it('opens another case\'s folder, and says that is what it is', async () => {
        // A warning, not a refusal: comparing a run against another scenario's
        // results is a thing fire engineers do on purpose.
        await enter('tunnel');

        await service.openFiles(filesFrom('demo', caseFolder('demo.smv')));

        expect(service.status).toBe('open');
        expect(service.message).toContain('demo.smv');
        expect(service.message).toContain('tunnel');
      });

      it('picks this scenario\'s case out of a folder holding several', async () => {
        await service.openFiles(filesFrom('runs', {
          'other.smv': smvFixture(), 'demo.smv': smvFixture()
        }));

        expect(service.status).toBe('open');
        expect(service.catalog.smvName).toBe('demo.smv');
        expect(service.smvChoice).toEqual([]);
      });

      it('asks which case, when none of them is this scenario\'s', async () => {
        await service.openFiles(filesFrom('runs', {
          'a.smv': smvFixture(), 'b.smv': smvFixture()
        }));

        expect(service.status).toBe('picking');
        expect(service.smvChoice).toEqual(['a.smv', 'b.smv']);
        expect(service.catalog).toBeNull();
      });

      it('reads the case the user chose from that list', async () => {
        await service.openFiles(filesFrom('runs', {
          'a.smv': smvFixture(), 'b.smv': smvFixture()
        }));

        await service.chooseSmv('b.smv');

        expect(service.status).toBe('open');
        expect(service.catalog.smvName).toBe('b.smv');
        expect(service.smvChoice).toEqual([]);
      });

      it('says so when the folder holds no case at all', async () => {
        await service.openFiles(filesFrom('pictures', { 'holiday.jpg': 12 }));

        expect(service.status).toBe('error');
        expect(service.message).toContain('.smv');
        expect(service.catalog).toBeNull();
      });
    });

    describe('the availability probes', () => {
      // A `.smv` is a table of contents written while the solver ran, so it
      // routinely names files an interrupted run never got to write.

      it('sizes the files that are there and flags the ones that are gone', async () => {
        await service.openFiles(filesFrom('demo',
          caseFolder('demo.smv', { 'demo_1_1.sf': 4096 })));

        expect(service.sizeOf(fileNamed('demo_1_1.sf'))).toBe(4096);
        expect(service.isAbsent(fileNamed('demo_1_1.sf'))).toBe(false);
        expect(service.isAbsent(fileNamed('demo_1_1.bf'))).toBe(true);
        expect(service.sizeOf(fileNamed('demo_1_1.bf'))).toBeNull();
      });

      it('lets an abandoned folder fall on the floor rather than into the next one', async () => {
        const first = service.openFiles(filesFrom('a',
          caseFolder('demo.smv', { 'demo_1_1.sf': 4096 })));

        await service.openFiles(filesFrom('b',
          caseFolder('demo.smv', { 'demo_1_1.sf': 8192 })));
        await first;

        expect(service.name).toBe('b');
        expect(service.sizeOf(fileNamed('demo_1_1.sf'))).toBe(8192);
      });
    });

    describe('the picker', () => {

      it('scans the folder it is handed, and remembers it for the scenario', async () => {
        const handle = handleFor('demo', caseFolder('demo.smv', { 'demo_1_1.sf': 2048 }));
        stubPicker(() => Promise.resolve(handle));

        await service.openPicker();

        expect(service.status).toBe('open');
        expect(service.name).toBe('demo');
        expect(service.sizeOf(fileNamed('demo_1_1.sf'))).toBe(2048);
        // stored under the scenario, because that is what a folder belongs to
        expect(remembered).toHaveBeenCalledWith(1, handle);
      });

      it('says nothing at all when the user closes the dialog', async () => {
        stubPicker(() => Promise.reject(new DOMException('user aborted', 'AbortError')));

        await service.openPicker();

        expect(service.status).toBe('closed');
        expect(service.message).toBe('');
      });

      it('stores nothing for the fallback, which has nothing to store', async () => {
        // A FileList is a snapshot no browser will serialise - a Firefox user
        // re-picks the folder after a reload, and that is the whole cost.
        await service.openFiles(filesFrom('demo', caseFolder('demo.smv')));

        expect(service.status).toBe('open');
        expect(remembered).not.toHaveBeenCalled();
      });
    });

    describe('coming back to a scenario', () => {

      it('opens a remembered folder the browser still trusts', async () => {
        recalled.and.returnValue(Promise.resolve(
          handleFor('demo', caseFolder('demo.smv'), { query: 'granted' })));

        await enter('demo', 42);
        await until(() => service.status === 'open');

        expect(recalled).toHaveBeenCalledWith(42);
        expect(service.catalog.smvName).toBe('demo.smv');
      });

      it('offers to resume one whose permission has lapsed', async () => {
        // After a browser restart a stored handle always comes back at
        // `prompt`, and the browser re-grants only from a click.
        recalled.and.returnValue(Promise.resolve(handleFor('demo',
          caseFolder('demo.smv'), { query: 'prompt', request: 'granted' })));

        await enter('demo', 42);
        await until(() => service.status !== 'closed');

        expect(service.status).toBe('resumable');
        expect(service.catalog).toBeNull();

        await service.resume();

        expect(service.status).toBe('open');
        expect(service.catalog.smvName).toBe('demo.smv');
      });

      it('closes when the permission is refused at the button', async () => {
        recalled.and.returnValue(Promise.resolve(handleFor('demo',
          caseFolder('demo.smv'), { query: 'prompt', request: 'denied' })));
        await enter('demo', 42);
        await until(() => service.status === 'resumable');

        await service.resume();

        expect(service.status).toBe('closed');
      });

      it('drops the whole state when the scenario changes', async () => {
        await service.openFiles(filesFrom('demo', caseFolder('demo.smv')));
        expect(service.status).toBe('open');

        await enter('other', 7);

        expect(service.status).toBe('closed');
        expect(service.catalog).toBeNull();
        expect(service.name).toBe('');
      });

      it('puts the folder away, and forgets it, on Close', async () => {
        await service.openFiles(filesFrom('demo', caseFolder('demo.smv')));

        service.close();

        expect(service.status).toBe('closed');
        expect(service.catalog).toBeNull();
        expect((service as any).forgetHandle).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('when the browser will not store anything', () => {
    // Private browsing, a blocked store, a browser that refuses to serialise a
    // handle: the folder still works, it just stops outliving the session -
    // the degradation LayoutService makes around localStorage.

    beforeEach(async () => {
      spyOn(indexedDB, 'open').and.throwError('storage is off');
      await enter('demo');
    });

    it('opens the folder anyway, and neither warns nor throws', async () => {
      stubPicker(() => Promise.resolve(handleFor('demo', caseFolder('demo.smv'))));

      await service.openPicker();

      expect(service.status).toBe('open');
      expect(service.message).toBe('');
      expect(service.catalog.smvName).toBe('demo.smv');
    });

    it('starts a scenario closed rather than failing to look', async () => {
      await enter('demo', 99);

      expect(service.status).toBe('closed');
    });
  });
});
