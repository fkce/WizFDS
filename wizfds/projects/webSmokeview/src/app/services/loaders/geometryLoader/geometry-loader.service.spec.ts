import { GeometryLoaderService, SimulationNode } from './geometry-loader.service';
import { HttpManagerService, Result } from '../../http-manager/http-manager.service';
import { ConfigService } from '../../config/config.service';
import { gzip } from 'pako';

function node(extension: string): SimulationNode {
  return {
    name: `case${extension}`, type: 'file', extension: extension,
    path: `sim/case${extension}`
  };
}

function served(data: unknown): Result {
  return { meta: { status: 'success', from: '', details: [] }, data: data };
}

// #115: the backend serves the raw `.smv` text (gzipped); parsing it belongs
// to the library. The loader's other job is to settle its promise - the old
// implementation left it pending forever on any branch but success.
describe('GeometryLoaderService', () => {
  let http: jasmine.SpyObj<HttpManagerService>;
  let loader: GeometryLoaderService;

  beforeEach(() => {
    // The static config normally arrives from assets at bootstrap
    ConfigService.settings = { name: 'test', host: '' };
    http = jasmine.createSpyObj('HttpManagerService', ['get']);
    loader = new GeometryLoaderService(http);
  });

  it('resolves with the .smv text the backend served', async () => {
    http.get.and.returnValue(Promise.resolve(served(gzip('CHID\n demo\n'))));

    const result = await loader.loadSmv(node('.smv'));

    expect(result.data).toBe('CHID\n demo\n');
  });

  it('rejects when the response is not a success', async () => {
    http.get.and.returnValue(Promise.resolve({
      meta: { status: 'error', from: '', details: ['no such file'] }, data: null
    } as Result));

    await expectAsync(loader.loadSmv(node('.smv'))).toBeRejected();
  });

  it('rejects a node that is not a .smv instead of hanging forever', async () => {
    // The old guard had no else: a .json node left the promise pending and
    // the caller waiting for a load that would never arrive.
    await expectAsync(loader.loadSmv(node('.json'))).toBeRejected();
    expect(http.get).not.toHaveBeenCalled();
  });

  it('rejects when the request itself fails', async () => {
    http.get.and.returnValue(Promise.reject('down'));

    await expectAsync(loader.loadSmv(node('.smv'))).toBeRejected();
  });
});
