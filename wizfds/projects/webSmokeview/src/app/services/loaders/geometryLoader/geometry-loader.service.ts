import { Injectable, isDevMode } from '@angular/core';
import { HttpManagerService, Result } from '../../http-manager/http-manager.service';
import { ungzip } from 'pako';
import { ConfigService } from '../../config/config.service';

@Injectable({
  providedIn: 'root'
})
export class GeometryLoaderService {

  constructor(
    private httpManager: HttpManagerService
  ) { }

  /**
   * Load / generate smokeview geometry
   * @param simulation tree node
   */
  public loadSmv(simulation: any) {
    // Create promise
    let promise = new Promise((resolve, reject) => {
      if (simulation.extension == '.smv') {

        this.httpManager.get(ConfigService.settings.host + `/api/loadSmv/${simulation.path}`).then(
          (result: Result) => {

            if (result.meta.status == 'success') {
              // Decode gzipped data
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

  /**
   * Load already generated json geometry
   * @param simulation tree node
   */
  public loadJson(simulation: any) {
    // Create promise
    let promise = new Promise((resolve, reject) => {
      if (simulation.extension == '.json') {

        this.httpManager.get(ConfigService.settings.host + `/api/loadJson/${simulation.path}`).then(
          (result: Result) => {

            if (result.meta.status == 'success') {
              // Decode gzipped data
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
