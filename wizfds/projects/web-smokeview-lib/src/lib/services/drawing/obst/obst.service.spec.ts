import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { ObstService } from './obst.service';
import { BabylonService } from '../../babylon/babylon.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { SceneBoundsService } from '../../scene-bounds/scene-bounds.service';
import { SceneColor, SceneHole, SceneObst, SceneXb } from '../scene-input';

/** An &SURF with TRANSPARENCY=1, as the app resolves it. */
const OPAQUE: SceneColor = { r: 1, g: 208 / 255, b: 0, a: 1 };

/** An &SURF with TRANSPARENCY=0.4 - drawn into the second buffer. */
const GLAZED: SceneColor = { r: 0, g: 128 / 255, b: 1, a: 0.4 };

function makeObst(id: string, xb: SceneXb, color: SceneColor = OPAQUE): SceneObst {
  return {
    id: id,
    uuid: `${id}-uuid`,
    xb: xb,
    surfId: 'SURF_1',
    permitHole: true,
    color: color
  };
}

function makeHole(id: string, xb: SceneXb): SceneHole {
  return {
    id: id,
    uuid: `${id}-uuid`,
    xb: xb
  };
}

/**
 * Signed volume of the triangle soup. Its sign encodes the winding: the back cap
 * draws only one facing, so geometry wound the other way shows its outside faces
 * painted red instead of capping the cut.
 */
function signedVolume(positions: ArrayLike<number>, indices: ArrayLike<number>): number {
  let v = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
    v += (
      positions[a] * (positions[b + 1] * positions[c + 2] - positions[b + 2] * positions[c + 1]) -
      positions[a + 1] * (positions[b] * positions[c + 2] - positions[b + 2] * positions[c]) +
      positions[a + 2] * (positions[b] * positions[c + 1] - positions[b + 1] * positions[c])
    ) / 6;
  }
  return v;
}

describe('ObstService', () => {
  let service: ObstService;
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;

  beforeEach(() => {
    // A headless engine is enough: the back cap is a mesh, and CSG runs on the CPU.
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);

    TestBed.configureTestingModule({
      providers: [{
        provide: BabylonService,
        useValue: {
          scene: scene,
          camera: { setPosition: () => { }, setTarget: () => { } },
          // No shader assets are served in the suite, and NullEngine compiles no
          // WGSL. Both are treated as non-fatal by the drawing services, so the
          // meshes are still built - which is what these tests are about.
          loadShaderSources: () => Promise.reject(new Error('no shader assets under test')),
          createShaderMaterial: () => Promise.reject(new Error('no shader assets under test'))
        }
      }]
    });
    service = TestBed.inject(ObstService);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('renderJson', () => {
    // The standalone viewer reads geometry straight out of a Smokeview export
    // and has no scenario to hand over - see ADR-0004.

    it('does not empty the buffers it was handed on the next render', () => {
      const data = {
        vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0],
        colors: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        indices: [0, 1, 2]
      };

      service.renderJson(data);
      service.obsts = [makeObst('W1', { x1: 0, x2: 4, y1: 2, y2: 2.2, z1: 0, z2: 3 })];
      service.holes = [];
      service.renderObsts();

      expect(data.vertices.length).toBe(9);
      expect(data.indices.length).toBe(3);
    });
  });

  describe('scene coordinates', () => {
    // The scene is drawn in FDS metres 1:1 with its origin at the FDS origin, so
    // a coordinate read off the screen can be typed straight into a .fds file -
    // see docs/adr/0002-wspolrzedne-w-metrach.md.

    /** The box the vertex buffer actually spans. */
    function drawnBox(vertices: readonly number[]) {
      const at = (offset: number) => {
        const values = [];
        for (let i = offset; i < vertices.length; i += 3) { values.push(vertices[i]); }
        return { min: Math.min(...values), max: Math.max(...values) };
      };
      return { x: at(0), y: at(1), z: at(2) };
    }

    it('draws an obst at the coordinates the scenario gave it', () => {
      // Far from the origin and far from unit size: normalisation would have
      // shifted this onto zero and squeezed it into a cube one unit across.
      service.obsts = [makeObst('W1', { x1: 100, x2: 140, y1: 50, y2: 70, z1: 0, z2: 6 })];
      service.holes = [];

      service.renderObsts();

      const drawn = drawnBox(service.vertices);
      expect(drawn.x).toEqual({ min: 100, max: 140 });
      expect(drawn.y).toEqual({ min: 50, max: 70 });
      expect(drawn.z).toEqual({ min: 0, max: 6 });
    });

    it('keeps a hundred-metre model a hundred metres across', () => {
      // Two obsts a hundred metres apart stay a hundred metres apart, whatever
      // else is in the scene - there is no global divisor left to change.
      service.obsts = [
        makeObst('NEAR', { x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 3 }),
        makeObst('FAR', { x1: 100, x2: 101, y1: 0, y2: 1, z1: 0, z2: 3 })
      ];
      service.holes = [];

      service.renderObsts();

      const drawn = drawnBox(service.vertices);
      expect(drawn.x.max - drawn.x.min).toBe(101);
    });
  });

  describe('vertex normals', () => {
    it('computes a unit normal for every vertex of every obst', () => {
      // Three walls so that per-obst normals cannot be confused with each other
      service.obsts = [
        makeObst('W1', { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 }),
        makeObst('W2', { x1: 0.0, x2: 0.2, y1: 0.0, y2: 4.0, z1: 0.0, z2: 3.0 }),
        makeObst('W3', { x1: 6.0, x2: 8.0, y1: 6.0, y2: 6.2, z1: 0.0, z2: 2.5 })
      ];
      service.holes = [];

      service.renderObsts();

      expect(service.normals.length).toBe(service.vertices.length);

      const lengths = [];
      for (let i = 0; i < service.normals.length; i += 3) {
        lengths.push(Math.hypot(service.normals[i], service.normals[i + 1], service.normals[i + 2]));
      }
      expect(lengths.length).toBe(3 * 24);
      lengths.forEach((len, i) => {
        expect(len).withContext(`normal ${i} must be a unit vector, got ${len}`).toBeCloseTo(1, 5);
      });
    });
  });

  describe('colours', () => {
    // The app resolves the &SURF before the obst crosses the boundary, so the
    // alpha it hands over is what decides which buffer the obst lands in.

    it('draws a fully opaque obst into the opaque buffer', () => {
      service.obsts = [makeObst('W1', { x1: 0, x2: 4, y1: 2, y2: 2.2, z1: 0, z2: 3 }, OPAQUE)];
      service.holes = [];

      service.renderObsts();

      expect(service.vertices.length).toBeGreaterThan(0);
      expect(service.meshTransparent).toBeFalsy();
    });

    it('draws an obst short of fully opaque into the transparent buffer', () => {
      service.obsts = [makeObst('W1', { x1: 0, x2: 4, y1: 2, y2: 2.2, z1: 0, z2: 3 }, GLAZED)];
      service.holes = [];

      service.renderObsts();

      expect(service.vertices.length).toBe(0);
      expect(service.meshTransparent).toBeTruthy();
    });

    it('puts the colour it was given into the vertex buffer', () => {
      service.obsts = [makeObst('W1', { x1: 0, x2: 4, y1: 2, y2: 2.2, z1: 0, z2: 3 }, OPAQUE)];
      service.holes = [];

      service.renderObsts();

      expect(service.colors.slice(0, 4)).toEqual([OPAQUE.r, OPAQUE.g, OPAQUE.b, OPAQUE.a]);
    });
  });

  describe('triangle winding', () => {
    const wallXb = { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 };

    beforeAll(async () => {
      // Without the CSG backend the hole is skipped and the obst is drawn solid,
      // so this test would compare a plain box against another plain box.
      await BABYLON.InitializeCSG2Async({ manifoldUrl: '/assets/manifold' });
    });

    it('winds obsts carrying a hole the same way as plain ones', () => {
      // The whole opaque buffer feeds one back-cap mesh with one material, so a
      // mixed winding shows up as red exterior walls on the obsts with openings.
      service.obsts = [makeObst('PLAIN', wallXb)];
      service.holes = [];
      service.renderObsts();
      const plain = signedVolume(service.vertices, service.indices);

      service.obsts = [makeObst('WITH_HOLE', wallXb)];
      service.holes = [makeHole('DOOR', { x1: 1.0, x2: 2.0, y1: 1.9, y2: 2.3, z1: 0.0, z2: 2.1 })];
      service.renderObsts();
      const cut = signedVolume(service.vertices, service.indices);

      expect(Math.abs(plain)).toBeGreaterThan(0);
      expect(Math.abs(cut)).toBeGreaterThan(0);
      expect(Math.sign(cut))
        .withContext(`plain ${plain.toFixed(4)} vs cut ${cut.toFixed(4)} - opposite signs mean opposite winding`)
        .toBe(Math.sign(plain));
    });

    /** Share of triangles whose vertex normal sits on the same side as their winding. */
    function normalWindingAgreement(): number {
      const p = service.vertices, n = service.normals, idx = service.indices;
      let agreeing = 0, counted = 0;
      for (let i = 0; i < idx.length; i += 3) {
        const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
        const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
        const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
        const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
        if (fx === 0 && fy === 0 && fz === 0) { continue; }
        counted++;
        if (fx * n[a] + fy * n[a + 1] + fz * n[a + 2] >= 0) { agreeing++; }
      }
      return counted === 0 ? -1 : agreeing / counted;
    }

    it('relates normals to winding on a cut obst exactly as on a plain one', () => {
      // obst.fragment.wgsl lights the surface with max(dot(normal, lightDir), 0)
      // over a 0.5 ambient floor, so a normal on the wrong side of its triangle
      // kills the diffuse term and the obst renders visibly darker than its
      // neighbours. What matters is that both paths agree - the absolute sign is
      // whatever VertexData.ComputeNormals settles on.
      service.obsts = [makeObst('PLAIN', wallXb)];
      service.holes = [];
      service.renderObsts();
      const plain = normalWindingAgreement();

      service.obsts = [makeObst('WITH_HOLE', wallXb)];
      service.holes = [makeHole('DOOR', { x1: 1.0, x2: 2.0, y1: 1.9, y2: 2.3, z1: 0.0, z2: 2.1 })];
      service.renderObsts();
      const cut = normalWindingAgreement();

      expect(plain).toBeGreaterThanOrEqual(0);
      expect(cut)
        .withContext(`plain obst ${(plain * 100).toFixed(0)}% of triangles agree, cut obst ${(cut * 100).toFixed(0)}%`)
        .toBeCloseTo(plain, 6);
    });
  });

  describe('scene registry', () => {
    const wallXb = { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 };
    let registry: SceneRegistryService;

    beforeEach(() => {
      registry = TestBed.inject(SceneRegistryService);
    });

    it('registers every obst it draws, by uuid', () => {
      service.obsts = [
        makeObst('W1', wallXb),
        makeObst('W2', { x1: 0.0, x2: 0.2, y1: 0.0, y2: 4.0, z1: 0.0, z2: 3.0 })
      ];
      service.holes = [];

      service.renderObsts();

      expect(registry.entryFor('W1-uuid')).toBeTruthy();
      expect(registry.entryFor('W2-uuid')).toBeTruthy();
      expect(registry.entryFor('W1-uuid').mesh).toBe(service.mesh);
    });

    it('maps a face back to the obst that owns it', () => {
      service.obsts = [makeObst('W1', wallXb), makeObst('W2', wallXb)];
      service.holes = [];

      service.renderObsts();

      const first = registry.entryFor('W1-uuid').faces;
      const second = registry.entryFor('W2-uuid').faces;
      expect(registry.uuidAt(service.mesh, first.first)).toBe('W1-uuid');
      expect(registry.uuidAt(service.mesh, first.first + first.count - 1)).toBe('W1-uuid');
      expect(registry.uuidAt(service.mesh, second.first)).toBe('W2-uuid');
    });

    it('maps faces of an obst carrying a hole, whose triangle count is not twelve', async () => {
      // `Math.floor(faceId / 12)` assumed every obst is twelve triangles, so a
      // single &HOLE shifted every later obst's identity by one.
      await BABYLON.InitializeCSG2Async({ manifoldUrl: '/assets/manifold' });

      service.obsts = [
        makeObst('CUT', wallXb),
        makeObst('PLAIN', { x1: 6.0, x2: 8.0, y1: 6.0, y2: 6.2, z1: 0.0, z2: 2.5 })
      ];
      service.holes = [makeHole('DOOR', { x1: 1.0, x2: 2.0, y1: 1.9, y2: 2.3, z1: 0.0, z2: 2.1 })];

      service.renderObsts();

      const cut = registry.entryFor('CUT-uuid').faces;
      const plain = registry.entryFor('PLAIN-uuid').faces;
      expect(cut.count).withContext('a cut obst is not twelve triangles').not.toBe(12);
      expect(registry.uuidAt(service.mesh, cut.first)).toBe('CUT-uuid');
      expect(registry.uuidAt(service.mesh, cut.first + cut.count - 1)).toBe('CUT-uuid');
      expect(registry.uuidAt(service.mesh, plain.first)).toBe('PLAIN-uuid');
    });

    it('forgets the previous render rather than stacking entries', () => {
      service.obsts = [makeObst('W1', wallXb)];
      service.holes = [];
      service.renderObsts();

      service.obsts = [makeObst('W2', wallXb)];
      service.renderObsts();

      expect(registry.entryFor('W1-uuid')).toBeUndefined();
      expect(registry.entryFor('W2-uuid')).toBeTruthy();
    });
  });

  describe('resetSceneState', () => {
    it('lets go of everything that belonged to the disposed scene', () => {
      service.obsts = [makeObst('W1', { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 })];
      service.holes = [];
      service.renderObsts();
      service.pickedObst = makeObst('W1', { x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 });

      expect(service.mesh).withContext('precondition: a mesh was built').toBeTruthy();

      service.resetSceneState();

      expect(service.mesh).toBeNull();
      expect(service.meshBackCap).toBeNull();
      expect(service.meshTransparent).toBeFalsy();
      expect(service.material).toBeNull();
      expect(service.pickedObst).toBeUndefined();
      expect(service.pickedObstMesh).toBeUndefined();
      expect(service.vertices.length).toBe(0);
      expect(service.indices.length).toBe(0);
      expect(service.normals.length).toBe(0);
      expect(service.positions.length).toBe(0);
    });

    it('leaves the service able to draw into the next scene', () => {
      service.obsts = [makeObst('W1', { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 })];
      service.holes = [];
      service.renderObsts();

      service.resetSceneState();
      service.renderObsts();

      expect(service.mesh).toBeTruthy();
      expect(service.vertices.length).toBeGreaterThan(0);
    });
  });

  describe('UI actions before the shaders have arrived', () => {
    // Materials are built inside a promise. Every control in the template is
    // clickable from the first frame, so each of these runs against a service
    // that has no mesh and no material yet.

    it('toggles the wireframe without throwing', () => {
      expect(() => service.toggleWireframe()).not.toThrow();
    });

    it('toggles the obst outline without throwing', () => {
      expect(() => service.toggleEdgesRendering()).not.toThrow();
    });

    it('clears a selection that was never made without throwing', () => {
      expect(() => service.clearSelection()).not.toThrow();
    });

    it('moves a clip slider without throwing', () => {
      expect(() => service.clip(50, 'x')).not.toThrow();
      expect(() => service.clip(50, 'y')).not.toThrow();
      expect(() => service.clip(50, 'z')).not.toThrow();
    });

    it('forgets the picked obst when the selection is cleared', () => {
      service.pickedObst = makeObst('WALL', { x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 });

      service.clearSelection();

      expect(service.pickedObst).toBeUndefined();
    });

    it('disposes the highlight box together with its material', () => {
      // selectObst() builds a fresh StandardMaterial for every pick, so leaving
      // it behind means one orphan per ctrl+click.
      const mesh = BABYLON.MeshBuilder.CreateBox('pickedObst', {}, scene);
      const material = new BABYLON.StandardMaterial('pickedObstMaterial', scene);
      mesh.material = material;
      service.pickedObstMesh = mesh;
      service.pickedObstMaterial = material;

      service.clearSelection();

      expect(mesh.isDisposed()).toBe(true);
      expect(scene.materials).not.toContain(material);
    });
  });

  describe('material lifetime', () => {
    beforeEach(() => {
      // The suite-wide stub rejects, so no material is ever built and there is
      // nothing to leak. Hand out real ones here to see what render() keeps.
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{
          provide: BabylonService,
          useValue: {
            scene: scene,
            camera: { setPosition: () => { }, setTarget: () => { } },
            loadShaderSources: () => Promise.reject(new Error('no shader assets under test')),
            createShaderMaterial: (spec: { name: string }) => Promise.resolve(
              new BABYLON.ShaderMaterial(spec.name, scene, { vertexSource: '', fragmentSource: '' }, {})
            )
          }
        }]
      });
      service = TestBed.inject(ObstService);
    });

    /** Let the .then() chains that build the materials run. */
    async function settleMaterials(): Promise<void> {
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    it('keeps the back cap opposite the wireframe across clicks', async () => {
      service.obsts = [makeObst('W1', { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 })];
      service.holes = [];
      service.renderObsts();
      await settleMaterials();

      service.toggleWireframe();
      expect(service.material.wireframe).withContext('first click, wireframe').toBe(true);
      expect(service.meshBackCap.isVisible).withContext('first click, back cap').toBe(false);

      service.toggleWireframe();
      expect(service.material.wireframe).withContext('second click, wireframe').toBe(false);
      expect(service.meshBackCap.isVisible).withContext('second click, back cap').toBe(true);
    });

    it('applies a wireframe toggled before the material existed', async () => {
      // Clicked while the shader was still in flight: the flag has nowhere to
      // land yet, but it must not be lost - and the back cap must not flip on
      // its own, which would leave the two permanently out of step.
      service.toggleWireframe();

      service.obsts = [makeObst('W1', { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 })];
      service.holes = [];
      service.renderObsts();
      await settleMaterials();

      expect(service.material.wireframe).toBe(true);
      expect(service.meshBackCap.isVisible).toBe(false);
    });

    it('carries clip values set before the materials arrived', async () => {
      TestBed.inject(SceneBoundsService).setFrom([{ x1: 0, x2: 10, y1: 0, y2: 8, z1: 0, z2: 4 }]);
      service.clip(50, 'x');

      service.obsts = [makeObst('W1', { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 })];
      service.holes = [];
      service.renderObsts();
      await settleMaterials();

      // Halfway along a ten-metre model is five metres - the shader is handed the
      // coordinate, not a fraction (ADR-0002). ShaderMaterial exposes no getter
      // for a uniform, hence the private read.
      expect(service.clipPlane('x')).toBe(5);
      expect((service.material as any)._floats.clipX)
        .withContext('the material built afterwards must pick up the slider position')
        .toBe(5);
    });

    it('does not grow the live mesh count across repeated renders', async () => {
      // Navigating back into the view re-renders the same scenario. Meshes are
      // disposed by name-less reference, so a missed dispose shows up here.
      service.obsts = [
        makeObst('W1', { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 }, OPAQUE),
        makeObst('W2', { x1: 0.0, x2: 0.2, y1: 0.0, y2: 4.0, z1: 0.0, z2: 3.0 }, GLAZED)
      ];
      service.holes = [];

      service.renderObsts();
      await settleMaterials();
      const afterFirst = scene.meshes.length;

      service.renderObsts();
      await settleMaterials();
      service.renderObsts();
      await settleMaterials();

      expect(afterFirst).toBeGreaterThan(0);
      expect(scene.meshes.length)
        .withContext(`${afterFirst} meshes after one render, ${scene.meshes.length} after three`)
        .toBe(afterFirst);
    });

    it('does not orphan a material on every render', async () => {
      // One opaque and one glazed wall, so all three materials are in play:
      // opaque, transparent and back cap.
      service.obsts = [
        makeObst('W1', { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 }, OPAQUE),
        makeObst('W2', { x1: 0.0, x2: 0.2, y1: 0.0, y2: 4.0, z1: 0.0, z2: 3.0 }, GLAZED)
      ];
      service.holes = [];

      service.renderObsts();
      await settleMaterials();
      const afterFirst = scene.materials.length;

      service.renderObsts();
      await settleMaterials();
      service.renderObsts();
      await settleMaterials();

      expect(afterFirst).toBeGreaterThan(0);
      expect(scene.materials.length)
        .withContext(`${afterFirst} materials after one render, ${scene.materials.length} after three`)
        .toBe(afterFirst);
    });
  });

  describe('clipping back cap', () => {
    it('builds the back cap for a plain wall', () => {
      service.obsts = [makeObst('WALL', { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 })];
      service.holes = [];

      service.renderObsts();

      expect(service.meshBackCap).toBeTruthy();
    });

    it('builds the back cap for a wall that has a doorway cut out of it', async () => {
      // Without the back cap the clipped cross-section renders hollow instead of
      // solid red - and the cap is switched off for the whole scene, not just
      // for the wall carrying the hole.
      await BABYLON.InitializeCSG2Async({ manifoldUrl: '/assets/manifold' });
      const registry = TestBed.inject(SceneRegistryService);

      service.obsts = [makeObst('WALL', { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 })];
      service.holes = [makeHole('DOOR', { x1: 1.0, x2: 2.0, y1: 1.9, y2: 2.3, z1: 0.0, z2: 2.1 })];

      service.renderObsts();

      expect(registry.entryFor('WALL-uuid').faces.count)
        .withContext('the doorway must reach the wall, so the wall is not a plain box')
        .not.toBe(12);
      expect(service.meshBackCap).toBeTruthy();
    });

    it('draws an obst that forbids holes as a solid box', () => {
      // PERMIT_HOLE=.FALSE. means FDS ignores the opening, so the preview has to
      // as well - even though the boxes overlap.
      const sealed: SceneObst = {
        ...makeObst('SEALED', { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 }),
        permitHole: false
      };
      service.obsts = [sealed];
      service.holes = [makeHole('DOOR', { x1: 1.0, x2: 2.0, y1: 1.9, y2: 2.3, z1: 0.0, z2: 2.1 })];

      service.renderObsts();

      const registry = TestBed.inject(SceneRegistryService);
      expect(registry.entryFor('SEALED-uuid').faces.count).toBe(12);
    });
  });
});
