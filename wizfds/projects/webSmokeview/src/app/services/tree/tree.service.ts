import { Injectable, isDevMode } from '@angular/core';
import { HttpManagerService, Result } from '../http-manager/http-manager.service';
import { environment } from '../../../environments/environment';

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

}