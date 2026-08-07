import { Component, OnInit, AfterViewInit, isDevMode } from '@angular/core';
import { SmokeviewApiService } from 'projects/web-smokeview-lib/src/lib/services/smokeview-api/smokeview-api.service';
import { SmvParserService } from 'projects/web-smokeview-lib/src/lib/services/parsers/smv/smv-parser.service';
import { SmvResultFile, SmvResultKind } from 'projects/web-smokeview-lib/src/lib/services/parsers/smv/smv-file';
import { ResultsDirectory } from 'projects/web-smokeview-lib/src/lib/services/results/results-directory';
import { HttpResultsDirectory } from 'projects/web-smokeview-lib/src/lib/services/results/http-results-directory';
import { groupResults, ResultFormatGroup } from 'projects/web-smokeview-lib/src/lib/services/results/quantity-groups';
import { TreeService, SimulationNode } from '../../services/tree/tree.service';
import { ConfigService } from '../../services/config/config.service';

/**
 * How this viewer words the formats and which icon it gives them. Wording and
 * pixels are the host's, the grouping behind them is the library's (ADR-0010),
 * which is why these sit here and not next to `groupResults`.
 */
const FORMAT_LABELS: Readonly<Record<SmvResultKind, string>> = {
  slcf: 'Slices',
  bndf: 'Boundaries',
  prt5: 'Particles',
  smoke3d: 'Smoke',
  isof: 'Isosurfaces'
};

const FORMAT_ICONS: Readonly<Record<SmvResultKind, string>> = {
  slcf: 'layers-outline',
  bndf: 'border-all-variant',
  prt5: 'scatter-plot',
  smoke3d: 'weather-fog',
  isof: 'shape-outline'
};

/** Powers of 1024, which is what a file manager means by KB. */
const SIZE_UNITS: readonly string[] = ['B', 'KB', 'MB', 'GB', 'TB'];

@Component({
    selector: 'app-tree',
    templateUrl: './tree.component.html',
    styleUrls: ['./tree.component.scss'],
    standalone: false
})
export class TreeComponent implements OnInit, AfterViewInit {


  l1: string = '';
  l2: string = '';
  l3: string = '';

  tree: object = {};

  /**
   * The loaded case, kept as the pair everything downstream needs: what the
   * run wrote, and where to get those bytes from. Phase 3 (#148) builds the
   * results catalog out of exactly these two, and the format readers of Phase
   * 6 (#149...#155) open files through the directory.
   */
  results: readonly SmvResultFile[] = [];
  resultsDirectory: ResultsDirectory | null = null;

  /** The catalog the panel lists: format, then quantity group, then one file per mesh. */
  resultFormats: readonly ResultFormatGroup[] = [];

  /**
   * What the availability probe found, by filename: a size when the file is
   * there, `null` when it is not, and no entry at all while the probe is still
   * out.
   */
  private availability = new Map<string, { size: number } | null>();

  /** Which format blocks are expanded; the tree keeps its own levels the same way. */
  private openFormats = new Set<SmvResultKind>();

  constructor(
    private smvApiService: SmokeviewApiService,
    private smvParserService: SmvParserService,
    private treeService: TreeService
  ) { }

  ngOnInit(): void {

  }

  ngAfterViewInit() {

    // Sync tree structure
    this.treeService.getTreeStructure().then(
      (data: any) => { this.tree = data; },
      (err) => { console.log(err); }
    );

  }

  /**
   * Load a simulation: read its raw `.smv` off the server, parse it in the
   * library, draw.
   *
   * The master file comes through the same byte-range route as every result
   * file will (#148, ADR-0016) - read whole here only because a `.smv` is text
   * and small. Everything the library draws goes through the same typed
   * contract, so the standalone viewer builds it from the parsed master file
   * exactly as the app builds it from a scenario (ADR-0004), and in FDS metres
   * (ADR-0002), which the retired Smokeview HTML export could not carry (#115).
   */
  public async loadSmv(simulation: SimulationNode) {
    try {
      const directory = new HttpResultsDirectory(this.caseUrl(simulation));
      const master = await directory.open(simulation.name);
      if (master === null) {
        throw new Error(`the server no longer has ${simulation.path}`);
      }

      const smv = this.smvParserService.parse(
        new TextDecoder().decode(await master.read(0, master.size)));

      this.resultsDirectory = directory;
      this.results = smv.results;
      this.resultFormats = groupResults(smv.results);
      this.availability = new Map();
      this.openFormats = new Set(this.resultFormats.map(format => format.kind));
      // Failures are logged by the library rather than rejected, so there is
      // nothing here to recover from - see SmokeviewApiService.render().
      void this.smvApiService.render(smv.scene);
      // Awaited so that loading a case means the whole of it; the panel does
      // not wait on this, its rows fill in as the answers land.
      await this.probeAvailability(directory, smv.results);
    }
    catch (error) {
      // A load that fails does so silently - the error goes to the console and
      // nowhere else - and nothing on screen says which case is drawn. That
      // makes the catalog the only label the panel has, and leaving the last
      // one standing would let it read as the catalog of the case just
      // clicked. An empty panel is the honest answer, and the only feedback
      // there is that the click came to nothing.
      this.resultsDirectory = null;
      this.results = [];
      this.resultFormats = [];
      this.availability = new Map();
      this.openFormats = new Set();
      if (isDevMode()) console.log(error);
    }
  }

  /**
   * Ask the directory for every file the `.smv` named, all of them at once.
   *
   * The catalog is on screen before any of this lands and each row fills in
   * its own size as the answer arrives, because a `.smv` is a table of
   * contents written while the solver ran and is routinely optimistic: an
   * interrupted run, or a half-finished copy, leaves it naming files that are
   * not there. Which ones those are is worth showing, and only the directory
   * can say.
   *
   * A probe that fails is not the same thing as a file that is missing.
   * `null` is the directory's ordinary answer for "not there"; a rejection is
   * the source itself breaking. Both leave the row marked unavailable - there
   * is nothing to read either way - but only the broken one is worth logging.
   */
  private probeAvailability(directory: ResultsDirectory, results: readonly SmvResultFile[]): Promise<void> {
    // The map this run writes into is taken now rather than reached for later:
    // loading another case gives the component a fresh one, and a probe can be
    // a slow server away from answering. Writing through the field would let
    // an abandoned case dribble its sizes into the catalog of the case that
    // replaced it; writing here leaves them in a map nothing reads any more.
    const availability = this.availability;

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

  public isFormatOpen(kind: SmvResultKind): boolean {
    return this.openFormats.has(kind);
  }

  public toggleFormat(kind: SmvResultKind) {
    if (this.openFormats.has(kind)) {
      this.openFormats.delete(kind);
    }
    else {
      this.openFormats.add(kind);
    }
  }

  public formatLabel(kind: SmvResultKind): string {
    return FORMAT_LABELS[kind];
  }

  public formatIcon(kind: SmvResultKind): string {
    return FORMAT_ICONS[kind];
  }

  /** The probed size, or null while the probe is still out or the file is gone. */
  public sizeOf(file: SmvResultFile): number | null {
    const probed = this.availability.get(file.filename);
    return probed ? probed.size : null;
  }

  /** True once the probe came back saying the directory has no such file. */
  public isAbsent(file: SmvResultFile): boolean {
    return this.availability.has(file.filename) && this.availability.get(file.filename) === null;
  }

  /**
   * A size the way a person reads one. Result files run from a few kilobytes
   * to several gigabytes, so the unit moves and one decimal is kept while it
   * still says something - `1.4 GB` is worth reading, `1.4 KB` barely.
   */
  public formatSize(bytes: number): string {
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < SIZE_UNITS.length - 1) {
      value = value / 1024;
      unit++;
    }

    // Rounding carries: 1 048 500 B is 1023.9 KB, which would print as
    // "1024 KB" - a quantity that already has a name of its own.
    if (unit > 0 && unit < SIZE_UNITS.length - 1 && Math.round(value) >= 1024) {
      value = value / 1024;
      unit++;
    }

    return unit === 0
      ? `${value} B`
      : `${value.toFixed(value < 10 ? 1 : 0)} ${SIZE_UNITS[unit]}`;
  }

  /**
   * The case directory, which is simply the `.smv`'s own directory: every
   * result file the master file names is relative to it, so that is the root
   * the results directory is built on. A `.smv` sitting directly in the
   * simulations root has no directory part at all.
   */
  private caseUrl(simulation: SimulationNode): string {
    const base = ConfigService.settings.host + '/api/results';
    const separator = simulation.path.lastIndexOf('/');
    if (separator < 0) { return base; }

    const caseDir = simulation.path.slice(0, separator)
      .split('/')
      .map(segment => encodeURIComponent(segment))
      .join('/');
    return `${base}/${caseDir}`;
  }

  public setLevel1(level: string) {
    if (this.l1 == level) {
      this.l1 = '';
    }
    else {
      this.l1 = level;
    }
  }

  public setLevel2(level: string) {
    if (this.l2 == level) {
      this.l2 = '';
    }
    else {
      this.l2 = level;
    }
  }

  public setLevel3(level: string) {
    if (this.l3 == level) {
      this.l3 = '';
    }
    else {
      this.l3 = level;
    }
  }

}
