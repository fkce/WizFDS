import { Injectable } from '@angular/core';
import { HttpManagerService, Result } from '../http-manager/http-manager.service';
import { ConfigService } from '../config/config.service';
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
   * Get tree structure with directories on remote host
   */
  public getTreeStructure() {
    let promise = new Promise((resolve, reject) => {
      this.httpManager.get(ConfigService.settings.host + '/api/tree').then(
        (result: Result) => {
          if (result.meta.status == 'success') {
            let data = ungzip(result.data, { to: 'string' });
            result.data = JSON.parse(data);
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