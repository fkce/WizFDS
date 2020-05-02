import { Component, OnInit, ViewChild, ElementRef, Input, OnChanges, SimpleChanges, isDevMode } from '@angular/core';
import { HttpManagerService, Result } from '../../services/http-manager/http-manager.service';
import { environment } from '../../../environments/environment';
import { SmokeviewApiService } from 'projects/web-smokeview-lib/src/lib/services/smokeview-api/smokeview-api.service';
import { TreeService } from '../../services/tree/tree.service';
import { GeometryLoaderService } from '../../services/loaders/geometryLoader/geometry-loader.service';

@Component({
  selector: 'app-tree',
  templateUrl: './tree.component.html',
  styleUrls: ['./tree.component.scss']
})
export class TreeComponent implements OnInit {

  @ViewChild('tree') private treeContainer: ElementRef;
  @Input() tree: any;

  l1: string = '';
  l2: string = '';
  l3: string = '';

  simpleTree: object = {};

  constructor(
    private httpManager: HttpManagerService,
    private smvApiService: SmokeviewApiService,
    private treeService: TreeService,
    private geomLoaderService: GeometryLoaderService
  ) { }

  ngOnInit(): void {

    // Sync tree structure
    this.treeService.getTreeStructure().then(
      (val: any) => { this.simpleTree = val; },
      (err) => { console.log(err); }
    );
    //this.getJsonObject();
  }

  /**
   * Load / generate smokeview geometry
   * @param simulation tree node
   */
  public loadSmv(simulation: any) {
    this.geomLoaderService.loadSmv(simulation).then(
      (result: Result) => {
        if (result.meta.status == 'success') {
          this.smvApiService.renderJsonObsts(result.data);
        }
      });
  }

  /**
   * Load already generated json geometry
   * @param simulation tree node
   */
  public loadJson(simulation: any) {
    this.geomLoaderService.loadJson(simulation).then(
      (result: Result) => {
        if (result.meta.status == 'success') {
          this.smvApiService.renderJsonObsts(result.data);
        }
      });
  }



  public getJsonObject() {
    this.httpManager.get(environment.host + '/api/obsts').then(
      (result: Result) => {

        if (result.meta.status == 'success') {

          this.smvApiService.renderJsonObsts(result.data);

          // Run renderObstJson()
          // Run renderMeshJson()
          // Run ...
          console.log(result.meta);

          // Asigning variables
          //this.vertices = result.data.vertices;
          //this.colors = result.data.colors;
          //this.indices = result.data.indices;

          //this.render();
          //this.zoomToCenter();
          //this.zoomToMesh();
        }
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
