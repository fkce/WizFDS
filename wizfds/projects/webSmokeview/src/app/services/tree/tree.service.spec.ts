import { TestBed } from '@angular/core/testing';

import { TreeService } from './tree.service';
import { HttpManagerService, Result } from '../http-manager/http-manager.service';
import { ConfigService } from '../config/config.service';

function served(data: unknown): Result {
  return { meta: { status: 'success', from: 'getTreeStructure()', details: [] }, data: data };
}

describe('TreeService', () => {
  let service: TreeService;
  let httpManager: { get: jasmine.Spy };

  beforeEach(() => {
    httpManager = { get: jasmine.createSpy('get') };
    ConfigService.settings = { name: 'test', host: 'http://localhost:4000' };

    TestBed.configureTestingModule({
      providers: [{ provide: HttpManagerService, useValue: httpManager }]
    });
    service = TestBed.inject(TreeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // #148: the tree arrives as JSON and is used as it stands. It used to come
  // gzipped into a string, so the only thing this service did with the answer
  // was undo that.
  it('hands the tree over exactly as the backend sent it', async () => {
    const tree = {
      name: 'simulations', path: '', type: 'directory',
      children: [{ name: 'demo.smv', path: 'demo/demo.smv', type: 'file', extension: '.smv' }]
    };
    httpManager.get.and.returnValue(Promise.resolve(served(tree)));

    expect(await service.getTreeStructure()).toEqual(tree);
    expect(httpManager.get).toHaveBeenCalledWith('http://localhost:4000/api/tree');
  });
});
