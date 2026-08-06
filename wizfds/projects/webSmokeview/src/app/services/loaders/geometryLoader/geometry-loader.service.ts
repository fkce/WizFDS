import { Injectable } from '@angular/core';
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
  /** With the dot, as the backend writes it: `.smv`. */
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
   * Fetch the raw `.smv` master file of a simulation.
   *
   * The backend serves the text as FDS wrote it (gzipped for the wire);
   * parsing belongs to the library's SmvParserService (#115, ADR-0016).
   * Resolves with `data` holding the text - and settles on **every** branch:
   * the old implementation left the promise pending forever on anything but
   * a success, and the caller waiting for a load that would never arrive.
   */
  public loadSmv(simulation: SimulationNode): Promise<Result> {
    if (simulation.extension != '.smv') {
      return Promise.reject(new Error(`not a .smv file: ${simulation.name}`));
    }

    return this.httpManager.get(ConfigService.settings.host + `/api/loadSmv/${simulation.path}`).then(
      (result: Result) => {
        if (result.meta.status != 'success') {
          throw new Error(result.meta.details.join('; ') || 'loading the .smv failed');
        }
        result.data = ungzip(result.data, { to: 'string' });
        return result;
      });
  }
}
