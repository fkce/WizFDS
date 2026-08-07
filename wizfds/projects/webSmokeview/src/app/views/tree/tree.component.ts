import { Component, OnInit, AfterViewInit, isDevMode } from '@angular/core';
import { SmokeviewApiService } from 'projects/web-smokeview-lib/src/lib/services/smokeview-api/smokeview-api.service';
import { SmvParserService } from 'projects/web-smokeview-lib/src/lib/services/parsers/smv/smv-parser.service';
import { SmvResultFile } from 'projects/web-smokeview-lib/src/lib/services/parsers/smv/smv-file';
import { ResultsDirectory } from 'projects/web-smokeview-lib/src/lib/services/results/results-directory';
import { HttpResultsDirectory } from 'projects/web-smokeview-lib/src/lib/services/results/http-results-directory';
import { TreeService, SimulationNode } from '../../services/tree/tree.service';
import { ConfigService } from '../../services/config/config.service';

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
      // Failures are logged by the library rather than rejected, so there is
      // nothing here to recover from - see SmokeviewApiService.render().
      void this.smvApiService.render(smv.scene);
    }
    catch (error) {
      if (isDevMode()) console.log(error);
    }
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
