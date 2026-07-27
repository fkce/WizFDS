import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { OpenService } from './open.service';
import { BabylonService } from '../../babylon/babylon.service';
import { IOpen, IXb } from '../interfaces';

function makeOpen(id: string, xb: IXb): IOpen {
  return {
    id: id,
    uuid: `${id}-uuid`,
    idAC: 1,
    xb: xb,
    vis: { xbNorm: { x1: 0, x2: 0, y1: 0, y2: 0, z1: 0, z2: 0 }, colorNorm: [0, 1, 0, 1] }
  } as IOpen;
}

describe('OpenService', () => {
  let service: OpenService;
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;

  beforeEach(() => {
    // A headless engine is enough: these tests count meshes, they do not draw.
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);

    TestBed.configureTestingModule({
      providers: [{
        provide: BabylonService,
        useValue: { scene: scene }
      }]
    });
    service = TestBed.inject(OpenService);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('tolerates the visibility button being clicked before anything is rendered', () => {
    expect(() => service.toogleVisibility()).not.toThrow();
  });

  describe('renderOpens', () => {
    // A vent on the y = 0 plane, so getPlaneDimFromXb() produces a plane
    const wall: IXb = { x1: 0, x2: 2, y1: 0, y2: 0, z1: 0, z2: 3 };
    const floor: IXb = { x1: 0, x2: 2, y1: 0, y2: 2, z1: 0, z2: 0 };

    it('disposes the previous meshes instead of leaking them', () => {
      service.opens = [makeOpen('OPEN_1', wall), makeOpen('OPEN_2', floor)];

      service.renderOpens();
      const firstPass = [...service.meshes];

      service.renderOpens();

      expect(firstPass.length).toBe(2);
      firstPass.forEach((mesh, i) => {
        expect(mesh.isDisposed())
          .withContext(`mesh ${i} from the previous render must be disposed`)
          .toBe(true);
      });
    });

    it('does not grow the scene on repeated renders', () => {
      service.opens = [makeOpen('OPEN_1', wall), makeOpen('OPEN_2', floor)];

      service.renderOpens();
      const afterFirst = scene.meshes.length;

      service.renderOpens();
      service.renderOpens();

      expect(scene.meshes.length).toBe(afterFirst);
    });

    it('disposes the material it created rather than orphaning it in the scene', () => {
      service.opens = [makeOpen('OPEN_1', wall)];

      service.renderOpens();
      const afterFirst = scene.materials.length;

      service.renderOpens();

      expect(scene.materials.length).toBe(afterFirst);
    });
  });
});
