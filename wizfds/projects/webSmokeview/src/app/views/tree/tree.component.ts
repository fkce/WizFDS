import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Result } from '../../services/http-manager/http-manager.service';
import { SmokeviewApiService } from 'projects/web-smokeview-lib/src/lib/services/smokeview-api/smokeview-api.service';
import { ObstJsonService } from 'projects/web-smokeview-lib/src/lib/services/parsers/smokeviewJson/obst-json.service';
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
    private obstJsonService: ObstJsonService,
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
   * Load / generate smokeview geometry
   * @param simulation tree node
   */
  public loadSmv(simulation: SimulationNode) {
    this.geomLoaderService.loadSmv(simulation).then(
      (result: Result) => {
        if (result.meta.status == 'success') {
          this.render(result.data);
        }
      });
  }

  /**
   * Load already generated json geometry
   * @param simulation tree node
   */
  public loadJson(simulation: SimulationNode) {
    this.geomLoaderService.loadJson(simulation).then(
      (result: Result) => {
        if (result.meta.status == 'success') {
          this.render(result.data);
        }
      });
  }

  /**
   * Hand a loaded simulation to the preview.
   *
   * Everything the library draws goes through the same typed contract, so the
   * standalone viewer builds it from the export it loaded exactly as the app
   * builds it from a scenario (ADR-0004). The library never sees the response.
   *
   * @param data the parsed export - see ObstJsonService for what it holds
   */
  private render(data: unknown): void {
    // Failures are logged by the library rather than rejected, so there is
    // nothing here to recover from - see SmokeviewApiService.render().
    void this.smvApiService.render(this.obstJsonService.toScene(data));
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
