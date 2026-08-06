import { Component, OnInit, AfterViewInit, isDevMode } from '@angular/core';
import { Result } from '../../services/http-manager/http-manager.service';
import { SmokeviewApiService } from 'projects/web-smokeview-lib/src/lib/services/smokeview-api/smokeview-api.service';
import { SmvParserService } from 'projects/web-smokeview-lib/src/lib/services/parsers/smv/smv-parser.service';
import { TreeService } from '../../services/tree/tree.service';
import { GeometryLoaderService, SimulationNode } from '../../services/loaders/geometryLoader/geometry-loader.service';

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

  constructor(
    private smvApiService: SmokeviewApiService,
    private smvParserService: SmvParserService,
    private treeService: TreeService,
    private geomLoaderService: GeometryLoaderService
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
   * Load a simulation: fetch its raw `.smv`, parse it in the library, draw.
   *
   * Everything the library draws goes through the same typed contract, so the
   * standalone viewer builds it from the parsed master file exactly as the app
   * builds it from a scenario (ADR-0004) - and in FDS metres (ADR-0002), which
   * the retired Smokeview HTML export could not carry (#115).
   */
  public loadSmv(simulation: SimulationNode) {
    this.geomLoaderService.loadSmv(simulation).then(
      (result: Result) => {
        const smv = this.smvParserService.parse(result.data);
        // Failures are logged by the library rather than rejected, so there is
        // nothing here to recover from - see SmokeviewApiService.render().
        void this.smvApiService.render(smv.scene);
      },
      (error) => {
        if (isDevMode()) console.log(error);
      });
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
