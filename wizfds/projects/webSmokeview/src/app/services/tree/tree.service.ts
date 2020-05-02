import { Injectable, isDevMode } from '@angular/core';
import { HttpManagerService, Result } from '../http-manager/http-manager.service';
import { environment } from '../../../environments/environment';
import { ungzip } from 'pako';

@Injectable({
  providedIn: 'root'
})
export class TreeService {

  tree: any;

  constructor(
    private httpManager: HttpManagerService
  ) { }

  /**
   * Get tree structure
   */
  public getTreeStructure() {
    let promise = new Promise((resolve, reject) => {
      this.httpManager.get(environment.host + '/api/tree').then(
        (result: Result) => {
          if (result.meta.status == 'success') {
            resolve(result.data.tree);
          }
          else {
            reject();
          }
        });
    });
    return promise;
  }

  public loadSim(simulation: any) {

    let promise = new Promise((resolve, reject) => {
      // Get directories structure from server
      if (simulation.extension == '.smv') {

        this.httpManager.get(environment.host + `/api/loadSim/${simulation.path}`).then(
          (result: Result) => {

            if (result.meta.status == 'success') {
              // Decode 
              let data = ungzip(result.data, { to: 'string' });
              result.data = JSON.parse(data);

              resolve(result);
            }
            else {
              reject();
            }
          },
          (error) => {
            if (isDevMode()) console.log(error);
          });
      }
    });
    return promise;
  }

}
