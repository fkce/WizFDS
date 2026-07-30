import { Injectable, isDevMode } from '@angular/core';
import { HttpManagerService, Result } from '../../http-manager/http-manager.service';
import { ungzip } from 'pako';
import { ConfigService } from '../../config/config.service';

/**
 * One entry of the file tree the backend lists - what the user clicks.
 *
 * The three fields the viewer reads. The response carries more (`children`,
 * `size`), and the tree renders those itself.
 */
export interface SimulationNode {
  readonly name: string,
  readonly type: string,
  /** With the dot, as the backend writes it: `.smv`, `.json`. */
  readonly extension: string,
  /** Where the file sits on the backend, which is what the loaders ask for. */
  readonly path: string
}

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
  public loadSmv(simulation: SimulationNode): Promise<Result> {
    // Create promise
    let promise = new Promise<Result>((resolve, reject) => {
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
  public loadJson(simulation: SimulationNode): Promise<Result> {
    // Create promise
    let promise = new Promise<Result>((resolve, reject) => {
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
