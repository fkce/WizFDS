import { Injectable, isDevMode } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { Main } from '@services/main/main';
import { MainService } from '@services/main/main.service';
import { FdsScenario } from '@services/fds-scenario/fds-scenario';
import { LocalResultsDirectory } from '../../../../../web-smokeview-lib/src/lib/services/results/local-results-directory';
import { SmvParserService } from '../../../../../web-smokeview-lib/src/lib/services/parsers/smv/smv-parser.service';
import { SmvFile, SmvResultFile } from '../../../../../web-smokeview-lib/src/lib/services/parsers/smv/smv-file';
import {
  groupResults, ResultFormatGroup
} from '../../../../../web-smokeview-lib/src/lib/services/results/quantity-groups';

/**
 * Where the results directory of the current scenario stands.
 *
 * `picking` covers both halves of choosing: the browser's own dialog is up, or
 * the folder held several cases and the panel is asking which one. `resumable`
 * is the state a page reload leaves behind - the folder is remembered, but the
 * browser will only re-grant access from a click (see the typings).
 */
export type ResultsStatus = 'closed' | 'picking' | 'resumable' | 'open' | 'error';

/** The status, and whatever the panel should say about it. */
export interface ResultsState {
  readonly status: ResultsStatus,
  /** Empty when there is nothing to say; a warning even while `open`. */
  readonly message: string
}

/** The catalog of one case: what it wrote, and how much of it is still there. */
export interface ResultsCatalog {
  /** The folder the user picked, by its own name. */
  readonly directoryName: string,
  /** The master file the catalog was read from. */
  readonly smvName: string,
  /** The CHID the `.smv` states, which need not be the scenario's. */
  readonly chid: string,
  readonly formats: readonly ResultFormatGroup[],
  /**
   * What the availability probes found, by filename: a size, `null` when the
   * directory has not got the file, and no entry while the probe is still out.
   * Filled in after the catalog is already on screen.
   */
  readonly availability: ReadonlyMap<string, { size: number } | null>
}

/** The IndexedDB the picked folder outlives the page in. */
const DB_NAME = 'wizfds';
const HANDLE_STORE = 'results-handles';

/**
 * The folder of FDS results the user pointed at, for the scenario they are in.
 *
 * The whole point of it is that a browser cannot read a path: an `.fds` file
 * knows where it was run, but nothing in a web page may open that directory
 * without the user handing it over. So this holds the handle they handed over,
 * remembers it per scenario, and turns it into the catalog the Results panel
 * lists (#148, ADR-0016).
 *
 * It reads the `.smv` and nothing else. Every result file stays unopened - the
 * catalog says what is there and how big it is, and opening one is the job of
 * the format readers of #149 onwards.
 *
 * `providedIn: 'root'` rather than an entry in AppModule, as LayoutService is:
 * the ribbon, the panel and the view all speak to the same one, and nothing
 * about it is view-scoped.
 */
@Injectable({ providedIn: 'root' })
export class ResultsDirectoryService {

  private readonly stateSubject = new BehaviorSubject<ResultsState>({ status: 'closed', message: '' });
  public readonly status$: Observable<ResultsState> = this.stateSubject.asObservable();

  private readonly catalogSubject = new BehaviorSubject<ResultsCatalog | null>(null);
  public readonly catalog$: Observable<ResultsCatalog | null> = this.catalogSubject.asObservable();

  private readonly smvChoiceSubject = new BehaviorSubject<readonly string[]>([]);
  /** The `.smv` files to choose between, when the folder holds several cases. */
  public readonly smvChoice$: Observable<readonly string[]> = this.smvChoiceSubject.asObservable();

  private main: Main;

  /** The source the catalog was read from, and reads its files through. */
  private directory: LocalResultsDirectory | null = null;

  /** The parsed master file behind the catalog - grids and obst boxes for #149. */
  private smvFile: SmvFile | null = null;

  /**
   * The handle behind that source, when there is one. The fallback path has
   * none: a `<input webkitdirectory>` yields a snapshot of files, which is
   * nothing a browser will store or re-open.
   */
  private handle: FileSystemDirectoryHandle | null = null;

  private directoryName = '';

  private availability = new Map<string, { size: number } | null>();

  /**
   * Which attempt is the current one.
   *
   * Everything here is a chain of awaits - a dialog, a permission, a parse, a
   * dozen probes - and a scenario can be switched, or another folder picked,
   * in the middle of any of them. Each step checks that the attempt it belongs
   * to is still the one in force, so an abandoned scan writes nothing.
   */
  private generation = 0;

  constructor(
    private mainService: MainService,
    private smvParserService: SmvParserService
  ) {
    // A reference to the object the app mutates in place, so the CHID is read
    // at the moment it is wanted - see MainService.getMain().
    this.mainService.getMain().subscribe(main => this.main = main);
    this.mainService.currentFdsScenario$.subscribe(scenario => void this.restore(scenario));
  }

  // ==========================================
  // What the ribbon and the panel read
  // ==========================================

  public get status(): ResultsStatus { return this.stateSubject.value.status; }

  public get message(): string { return this.stateSubject.value.message; }

  public get catalog(): ResultsCatalog | null { return this.catalogSubject.value; }

  /** The parsed `.smv` behind the catalog, for the format readers (#149...). */
  public get smv(): SmvFile | null { return this.smvFile; }

  /** The byte source of the case on screen, for the format readers (#149...). */
  public get source(): LocalResultsDirectory | null { return this.directory; }

  public get smvChoice(): readonly string[] { return this.smvChoiceSubject.value; }

  /** The folder's own name, which is the only label the user recognises. */
  public get name(): string { return this.directoryName; }

  /** Whether this browser has a directory picker at all (Chromium only). */
  public get canPick(): boolean { return 'showDirectoryPicker' in window; }

  /**
   * The scenario's CHID, read on demand.
   *
   * Never cached: `currentFdsScenario$` fires when the scenario changes, not
   * when its CHID is edited (main.service.ts:28-30), so a copy taken here
   * would quietly go stale the first time somebody renamed a case.
   */
  public get scenarioChid(): string {
    return this.main?.currentFdsScenario?.fdsObject?.general?.head?.chid ?? '';
  }

  /** The case on screen, or - with nothing open - the one being looked for. */
  public get caseChid(): string {
    return this.catalog?.chid || this.scenarioChid;
  }

  /** The probed size, or null while the probe is out or the file is gone. */
  public sizeOf(file: SmvResultFile): number | null {
    const probed = this.availability.get(file.filename);
    return probed ? probed.size : null;
  }

  /** True once a probe came back saying the directory has no such file. */
  public isAbsent(file: SmvResultFile): boolean {
    return this.availability.has(file.filename) && this.availability.get(file.filename) === null;
  }

  // ==========================================
  // Opening a folder
  // ==========================================

  /**
   * Ask for a folder through the browser's own picker.
   *
   * Must be called from a click: the API refuses without a user gesture. The
   * `id` gives the browser a bookmark, so the second time a user opens this
   * they start where they left off rather than at their home directory.
   */
  public async openPicker(): Promise<void> {
    if (!this.canPick) {
      this.setState('error', 'This browser has no folder picker - use the folder input instead.');
      return;
    }

    const before = this.stateSubject.value;
    const mine = ++this.generation;
    this.setState('picking', 'Choosing a folder...');

    let picked: FileSystemDirectoryHandle;
    try {
      picked = await window.showDirectoryPicker({ id: 'wizfds-results', mode: 'read' });
    } catch (error) {
      if (mine !== this.generation) { return; }
      // Closing the dialog is an answer, not a failure: the panel goes back to
      // whatever it was showing and says nothing about it.
      if (isAbort(error)) { this.stateSubject.next(before); }
      else { this.setState('error', describe(error)); }
      return;
    }

    if (mine !== this.generation) { return; }
    this.handle = picked;
    await this.scan(new LocalResultsDirectory(picked), picked.name, mine);
  }

  /**
   * The way in for browsers without a picker: whatever `<input type="file"
   * webkitdirectory>` collected.
   *
   * Nothing about this survives the page. A `FileList` is a snapshot the
   * browser will not serialise, so there is deliberately no persistence here -
   * a Firefox user re-picks the folder after a reload, which is the whole of
   * what the fallback costs them.
   */
  public async openFiles(files: FileList | readonly File[]): Promise<void> {
    const mine = ++this.generation;
    this.handle = null;
    await this.scan(LocalResultsDirectory.fromFiles(files), pickedDirectoryName(files), mine);
  }

  /**
   * Read the case the user chose from the several the folder held.
   *
   * A choice of table of contents, not of results: what it decides is which
   * `.smv` names the catalog.
   */
  public async chooseSmv(smvName: string): Promise<void> {
    if (!this.directory) { return; }

    const mine = this.generation;
    this.smvChoiceSubject.next([]);
    await this.read(this.directory, smvName, mine);
  }

  /**
   * Ask for the remembered folder again, from a click.
   *
   * This is the one thing a stored handle cannot do by itself: after a browser
   * restart the permission always comes back at `prompt`, and `requestPermission()`
   * is refused outside a user gesture.
   */
  public async resume(): Promise<void> {
    const handle = this.handle;
    if (!handle) { return; }

    const mine = this.generation;
    const permission = await this.permissionFor(handle, 'request');
    if (mine !== this.generation) { return; }

    if (permission !== 'granted') {
      this.setState('closed', '');
      return;
    }
    await this.scan(new LocalResultsDirectory(handle), handle.name, mine);
  }

  /**
   * Put the folder away - and forget it, rather than only hide it. A folder
   * that came back on the next reload would make this button read as a lie.
   */
  public close(): void {
    const scenarioId = this.main?.currentFdsScenario?.id;
    this.reset();
    if (scenarioId) { void this.forgetHandle(scenarioId); }
  }

  // ==========================================
  // The scan
  // ==========================================

  /**
   * Find the case in the folder, and read its catalog.
   *
   * The rule for which `.smv` is what the decision on #148 settled on: one
   * master file is the case whatever it is called (with a warning when it is
   * not this scenario's, since a folder of the wrong results is a mistake
   * worth naming); several, and the scenario's own CHID picks between them;
   * failing that, only the user can say.
   */
  private async scan(directory: LocalResultsDirectory, directoryName: string, mine: number): Promise<void> {
    this.directory = directory;
    this.smvFile = null;
    this.directoryName = directoryName;
    this.smvChoiceSubject.next([]);
    this.catalogSubject.next(null);
    this.availability = new Map();

    try {
      const masters = (await directory.listFiles())
        .filter(name => name.toLowerCase().endsWith('.smv'));
      if (mine !== this.generation) { return; }

      if (masters.length === 0) {
        this.setState('error',
          'No .smv file in that folder - an FDS run writes one beside its results.');
        return;
      }
      if (masters.length === 1) {
        await this.read(directory, masters[0], mine);
        return;
      }

      const chid = this.scenarioChid;
      const wanted = masters.find(name => sameFilename(name, `${chid}.smv`));
      if (wanted) {
        await this.read(directory, wanted, mine);
        return;
      }

      this.smvChoiceSubject.next(masters);
      this.setState('picking', 'That folder holds several cases - choose one.');
    } catch (error) {
      if (mine === this.generation) { this.setState('error', describe(error)); }
    }
  }

  /**
   * Read one `.smv` whole and turn it into the catalog.
   *
   * Whole because a master file is text and small - the byte ranges the
   * contract is built for are for the result files, which are not (ADR-0016).
   */
  private async read(directory: LocalResultsDirectory, smvName: string, mine: number): Promise<void> {
    try {
      const master = await directory.open(smvName);
      if (mine !== this.generation) { return; }
      if (master === null) {
        this.setState('error', `${smvName} is no longer in that folder.`);
        return;
      }

      const smv = this.smvParserService.parse(
        new TextDecoder().decode(await master.read(0, master.size)));
      if (mine !== this.generation) { return; }
      this.smvFile = smv;

      // The map this scan writes into is taken now rather than reached for
      // later: picking another folder gives the service a fresh one, and a
      // probe can be a slow disk away from answering. Writing through the
      // field would let an abandoned scan dribble its sizes into the catalog
      // that replaced it; writing here leaves them where nothing reads them.
      const availability = new Map<string, { size: number } | null>();
      this.availability = availability;

      this.catalogSubject.next({
        directoryName: this.directoryName,
        smvName: smvName,
        chid: smv.chid,
        formats: groupResults(smv.results),
        availability: availability
      });
      this.setState('open', this.mismatchWarning(smvName));

      await this.remember();
      // The catalog is on screen already; the rows fill in as answers land.
      await this.probe(directory, smv.results, availability);
    } catch (error) {
      if (mine === this.generation) { this.setState('error', describe(error)); }
    }
  }

  /**
   * Ask the directory for every file the `.smv` named, all at once.
   *
   * A `.smv` is a table of contents written while the solver ran, so it is
   * routinely optimistic: an interrupted run, or a half-finished copy, leaves
   * it naming files that are not on the disk. Which ones those are is worth
   * showing, and only the directory can say.
   *
   * A probe that fails is not the same as a file that is missing - `null` is
   * the contract's ordinary "not there", a rejection is the source itself
   * breaking. Both leave the row unavailable, only the second is worth logging.
   */
  private probe(
    directory: LocalResultsDirectory,
    results: readonly SmvResultFile[],
    availability: Map<string, { size: number } | null>
  ): Promise<void> {
    const probes = results.map(entry => directory.open(entry.filename)
      .then(handle => {
        availability.set(entry.filename, handle === null ? null : { size: handle.size });
      })
      .catch(error => {
        if (isDevMode()) console.log(error);
        availability.set(entry.filename, null);
      }));

    return Promise.all(probes).then(() => undefined);
  }

  /** What to say when the folder holds a case this scenario did not run. */
  private mismatchWarning(smvName: string): string {
    const chid = this.scenarioChid;
    if (!chid || sameFilename(smvName, `${chid}.smv`)) { return ''; }
    // A warning, not a refusal: comparing a run against another scenario's
    // results is a thing fire engineers do on purpose.
    return `That folder holds ${smvName}, while this scenario's CHID is ${chid}.`;
  }

  // ==========================================
  // Remembering the folder, per scenario
  // ==========================================

  /**
   * Put the state back to nothing, and take over as the current attempt.
   *
   * Returns the generation it started, so what follows can tell whether it is
   * still the attempt in force.
   */
  private reset(): number {
    this.directory = null;
    this.smvFile = null;
    this.handle = null;
    this.directoryName = '';
    this.availability = new Map();
    this.catalogSubject.next(null);
    this.smvChoiceSubject.next([]);
    this.stateSubject.next({ status: 'closed', message: '' });
    return ++this.generation;
  }

  /**
   * Pick up where the scenario left off.
   *
   * The folder belongs to the scenario, not to the browser: a user with three
   * scenarios open in three tabs means three different sets of results, so the
   * handle is stored under the scenario's id and the state is dropped whenever
   * the scenario changes.
   */
  private async restore(scenario: FdsScenario | undefined): Promise<void> {
    const mine = this.reset();
    const scenarioId = scenario?.id;
    if (!scenarioId) { return; }

    const stored = await this.recallHandle(scenarioId);
    if (stored === null || mine !== this.generation) { return; }

    const permission = await this.permissionFor(stored, 'query');
    if (mine !== this.generation) { return; }

    if (permission === 'granted') {
      this.handle = stored;
      await this.scan(new LocalResultsDirectory(stored), stored.name, mine);
      return;
    }
    if (permission === 'prompt') {
      // As far as this can get without a click - which is what the button is.
      this.handle = stored;
      this.setState('resumable', `${stored.name} needs your permission again.`);
    }
  }

  /**
   * Store the folder, so the next visit to this scenario starts with it.
   *
   * Only a handle: the fallback path has nothing serialisable, and the whole
   * store is best-effort anyway - see `withHandleStore()`.
   */
  private async remember(): Promise<void> {
    const scenarioId = this.main?.currentFdsScenario?.id;
    if (!this.handle || !scenarioId) { return; }

    await this.rememberHandle(scenarioId, this.handle);
  }

  private async permissionFor(
    handle: FileSystemDirectoryHandle,
    ask: 'query' | 'request'
  ): Promise<PermissionState> {
    try {
      // Chromium-only, like the picker itself - and a handle that came out of
      // storage in some future browser may not carry them at all.
      if (typeof handle.queryPermission !== 'function') { return 'denied'; }

      return ask === 'query'
        ? await handle.queryPermission({ mode: 'read' })
        : await handle.requestPermission({ mode: 'read' });
    } catch (error) {
      if (isDevMode()) console.log(error);
      return 'denied';
    }
  }

  private async rememberHandle(scenarioId: number, handle: FileSystemDirectoryHandle): Promise<void> {
    await this.withHandleStore('readwrite', store => store.put(handle, scenarioId));
  }

  private async recallHandle(scenarioId: number): Promise<FileSystemDirectoryHandle | null> {
    const stored = await this.withHandleStore('readonly', store => store.get(scenarioId));
    return (stored as FileSystemDirectoryHandle) ?? null;
  }

  private async forgetHandle(scenarioId: number): Promise<void> {
    await this.withHandleStore('readwrite', store => store.delete(scenarioId));
  }

  /**
   * One transaction against the handle store, promised, and forgiving.
   *
   * Every access is wrapped: private browsing, a blocked store, a browser that
   * refuses to serialise a handle - none of them are worth an error on screen,
   * because the folder still works, it just stops outliving the session. Same
   * degradation LayoutService makes around localStorage.
   *
   * The store keeps its keys out of line: the value is an opaque handle with
   * nothing in it to key on, and the key is the scenario it was picked for.
   */
  private async withHandleStore(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest
  ): Promise<unknown> {
    let opened: IDBDatabase | null = null;
    try {
      const db = await openHandleDb();
      opened = db;
      return await new Promise<unknown>((resolve, reject) => {
        const request = action(db.transaction(HANDLE_STORE, mode).objectStore(HANDLE_STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      if (isDevMode()) console.log(error);
      return undefined;
    } finally {
      if (opened) { opened.close(); }
    }
  }

  private setState(status: ResultsStatus, message: string): void {
    this.stateSubject.next({ status: status, message: message });
  }
}

/** The raw IndexedDB API, promised - no library for one store of one key. */
function openHandleDb(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(HANDLE_STORE)) {
        request.result.createObjectStore(HANDLE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    // Another tab holding an older version open. Rejected rather than left
    // hanging: an await that never settles is worse than no persistence.
    request.onblocked = () => reject(new Error('the results store is open in another tab'));
  });
}

/** Whether the user simply closed the picker. */
function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/** What to put on screen when something genuinely went wrong. */
function describe(error: unknown): string {
  if (isDevMode()) console.log(error);
  return error instanceof Error && error.message
    ? `Could not read that folder: ${error.message}`
    : 'Could not read that folder.';
}

/**
 * Two filenames naming the same file. Case-insensitively, because Windows -
 * where most WizFDS users are - hands back `Case.smv` for a CHID of `case`.
 */
function sameFilename(one: string, other: string): boolean {
  return one.toLowerCase() === other.toLowerCase();
}

/**
 * The name of the folder a directory input was pointed at - the first segment
 * of any `webkitRelativePath` it filled in (MDN's example:
 * `PhotoAlbums/Birthdays/.../PIC2343.jpg`). Files picked one by one carry none,
 * and then the folder has no name to show.
 */
function pickedDirectoryName(files: FileList | readonly File[]): string {
  const first = Array.from(files)[0];
  const relative = first?.webkitRelativePath ?? '';
  return relative.includes('/') ? relative.split('/')[0] : '';
}
