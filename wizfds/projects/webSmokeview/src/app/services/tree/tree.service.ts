import { Injectable } from '@angular/core';
import { HttpManagerService, Result } from '../http-manager/http-manager.service';
import { ConfigService } from '../config/config.service';

/**
 * One entry of the file tree the backend lists - what the user clicks.
 *
 * The four fields the viewer reads. The response carries more (`children`,
 * `size`), and the tree renders those itself.
 */
export interface SimulationNode {
  readonly name: string,
  readonly type: string,
  /** With the dot, as the backend writes it: `.smv`. */
  readonly extension: string,
  /**
   * Where the file sits under the simulations root, `/`-separated - never
   * where it sits on the server's disk. It is the same root `/api/results/`
   * resolves against, so this path goes straight behind that URL.
   */
  readonly path: string
}

@Injectable({
  providedIn: 'root'
})
export class TreeService {

  tree: any;

  constructor(
    private httpManager: HttpManagerService
  ) { }

  /**
   * Get tree structure with directories on remote host
   *
   * Plain JSON since #148 - the backend used to gzip the tree into a string
   * that had to be unpacked here, which is a compression library's worth of
   * client code for something the transport already does.
   */
  public getTreeStructure() {
    let promise = new Promise((resolve, reject) => {
      this.httpManager.get(ConfigService.settings.host + '/api/tree').then(
        (result: Result) => {
          if (result.meta.status == 'success') {
            resolve(result.data);
          }
          else {
            reject();
          }
        });
    });
    return promise;
  }

}
