import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { ObstService } from './obst.service';
import { BabylonService } from '../../babylon/babylon.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { SceneBoundsService } from '../../scene-bounds/scene-bounds.service';
import { SceneColor, SceneHole, SceneObst, SceneXb } from '../scene-input';

/** An &SURF with TRANSPARENCY=1, as the app resolves it. */
const OPAQUE: SceneColor = { r: 1, g: 208 / 255, b: 0, a: 1 };

/** An &SURF with TRANSPARENCY=0.4 - drawn out of the second pool. */
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

/** Share of triangles whose vertex normal sits on the same side as their winding. */
function normalWindingAgreement(mesh: BABYLON.Mesh): number {
  const p = mesh.getVerticesData('position');
  const n = mesh.getVerticesData('normal');
  const idx = mesh.getIndices();
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

describe('ObstService', () => {
  let service: ObstService;
  let registry: SceneRegistryService;
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
    registry = TestBed.inject(SceneRegistryService);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  /** The box an instanced obst is actually drawn as, read off its matrix. */
  function drawnBox(uuid: string): SceneXb {
    const entry = registry.entryFor(uuid);
    const matrix = (entry.mesh as BABYLON.Mesh).thinInstanceGetWorldMatrices()[entry.instance];
    const at = (x: number, y: number, z: number) =>
      BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(x, y, z), matrix);
    const low = at(-0.5, -0.5, -0.5), high = at(0.5, 0.5, 0.5);
    return { x1: low.x, x2: high.x, y1: low.y, y2: high.y, z1: low.z, z2: high.z };
  }

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

    it('draws the buffer it was handed on a mesh of its own', () => {
      // Nothing to instance and nothing to identify: there is no scenario behind
      // these triangles, only the export they were read out of.
      service.renderJson({
        vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0],
        colors: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        indices: [0, 1, 2]
      });

      expect(service.jsonMesh).toBeTruthy();
      expect(service.jsonMesh.getTotalVertices()).toBe(3);
    });
  });

  describe('scene coordinates', () => {
    // The scene is drawn in FDS metres 1:1 with its origin at the FDS origin, so
    // a coordinate read off the screen can be typed straight into a .fds file -
    // see docs/adr/0002-wspolrzedne-w-metrach.md.

    it('draws an obst at the coordinates the scenario gave it', () => {
      // Far from the origin and far from unit size: normalisation would have
      // shifted this onto zero and squeezed it into a cube one unit across.
      const xb = { x1: 100, x2: 140, y1: 50, y2: 70, z1: 0, z2: 6 };
      service.obsts = [makeObst('W1', xb)];
      service.holes = [];

      service.renderObsts();

      const drawn = drawnBox('W1-uuid');
      (['x1', 'x2', 'y1', 'y2', 'z1', 'z2'] as const).forEach(key => {
        expect(drawn[key]).withContext(key).toBeCloseTo(xb[key], 4);
      });
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

      expect(drawnBox('FAR-uuid').x2 - drawnBox('NEAR-uuid').x1).toBeCloseTo(101, 4);
    });
  });

  describe('clipping', () => {
    let bounds: SceneBoundsService;

    beforeEach(() => {
      bounds = TestBed.inject(SceneBoundsService);
    });

    it('starts out showing the whole model, whatever its extent', () => {
      // The shader keeps what is above the plane on x and y and what is below it
      // on z, so "show everything" is not the same end on all three axes.
      bounds.setFrom([{ x1: -20, x2: 400, y1: 0, y2: 100, z1: 0, z2: 30 }]);

      service.resetClipping();

      expect(service.clipPlane('x')).toBeLessThan(-20);
      expect(service.clipPlane('y')).toBeLessThan(0);
      expect(service.clipPlane('z')).toBeGreaterThan(30);
    });

    it('pulls the planes back when a different model is measured', () => {
      // A plane is a coordinate now, so it means nothing once the model changes:
      // z = 2 m is head height in a room and the floor of a tunnel.
      bounds.setFrom([{ x1: 0, x2: 10, y1: 0, y2: 8, z1: 0, z2: 4 }]);
      service.resetClipping();
      service.clip(2, 'z');

      bounds.setFrom([{ x1: 0, x2: 400, y1: 0, y2: 100, z1: 0, z2: 30 }]);
      service.resetClipping();

      expect(service.clipPlane('z'))
        .withContext('a 2 m ceiling would hide all but the floor of a tunnel')
        .toBeGreaterThan(30);
    });
  });

  describe('vertex normals', () => {
    it('gives the base box a unit normal on every vertex', () => {
      // Every plain obst in the scene is lit off these twenty-four normals
      service.obsts = [makeObst('W1', { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 })];
      service.holes = [];

      service.renderObsts();

      const normals = service.opaqueMesh.getVerticesData('normal');
      expect(normals.length).toBe(24 * 3);
      for (let i = 0; i < normals.length; i += 3) {
        const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2]);
        expect(length).withContext(`normal ${i / 3} must be a unit vector`).toBeCloseTo(1, 5);
      }
    });
  });

  describe('colours', () => {
    // The app resolves the &SURF before the obst crosses the boundary, so the
    // alpha it hands over is what decides which pool the obst lands in.

    it('draws a fully opaque obst out of the opaque pool', () => {
      service.obsts = [makeObst('W1', { x1: 0, x2: 4, y1: 2, y2: 2.2, z1: 0, z2: 3 }, OPAQUE)];
      service.holes = [];

      service.renderObsts();

      expect(service.opaqueMesh.thinInstanceCount).toBe(1);
      expect(service.transparentMesh.thinInstanceCount).toBe(0);
    });

    it('draws an obst short of fully opaque out of the transparent pool', () => {
      service.obsts = [makeObst('W1', { x1: 0, x2: 4, y1: 2, y2: 2.2, z1: 0, z2: 3 }, GLAZED)];
      service.holes = [];

      service.renderObsts();

      expect(service.opaqueMesh.thinInstanceCount).toBe(0);
      expect(service.transparentMesh.thinInstanceCount).toBe(1);
    });

    it('puts the colour it was given into the instance buffer', () => {
      service.obsts = [makeObst('W1', { x1: 0, x2: 4, y1: 2, y2: 2.2, z1: 0, z2: 3 }, OPAQUE)];
      service.holes = [];

      service.renderObsts();

      const colors = service.opaqueMesh.getVertexBuffer('instanceColor').getData() as Float32Array;
      [OPAQUE.r, OPAQUE.g, OPAQUE.b, OPAQUE.a].forEach((expected, i) => {
        expect(colors[i]).withContext(`component ${i}`).toBeCloseTo(expected, 6);
      });
    });
  });

  describe('triangle winding', () => {
    const wallXb = { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 };
    const doorXb = { x1: 1.0, x2: 2.0, y1: 1.9, y2: 2.3, z1: 0.0, z2: 2.1 };

    beforeAll(async () => {
      // Without the CSG backend the hole is skipped and the obst is drawn solid,
      // so this test would compare a plain box against another plain box.
      await BABYLON.InitializeCSG2Async({ manifoldUrl: '/assets/manifold' });
    });

    it('winds an obst carrying a hole the same way as the base box', () => {
      // The two paths feed two back caps drawing one facing each, so opposite
      // windings show up as red exterior walls on the obsts with openings.
      service.obsts = [makeObst('PLAIN', wallXb)];
      service.holes = [];
      service.renderObsts();
      const base = signedVolume(
        service.opaqueMesh.getVerticesData('position'), service.opaqueMesh.getIndices());

      service.obsts = [makeObst('WITH_HOLE', wallXb)];
      service.holes = [makeHole('DOOR', doorXb)];
      service.renderObsts();
      const cutMesh = service.ownMeshFor('WITH_HOLE-uuid');
      const cut = signedVolume(cutMesh.getVerticesData('position'), cutMesh.getIndices());

      expect(Math.abs(base)).toBeGreaterThan(0);
      expect(Math.abs(cut)).toBeGreaterThan(0);
      expect(Math.sign(cut))
        .withContext(`base ${base.toFixed(4)} vs cut ${cut.toFixed(4)} - opposite signs mean opposite winding`)
        .toBe(Math.sign(base));
    });

    it('relates normals to winding on a cut obst exactly as on the base box', () => {
      // obst.fragment.wgsl lights the surface with max(dot(normal, lightDir), 0)
      // over a 0.5 ambient floor, so a normal on the wrong side of its triangle
      // kills the diffuse term and the obst renders visibly darker than its
      // neighbours. What matters is that both paths agree - the absolute sign is
      // whatever VertexData.ComputeNormals settles on.
      service.obsts = [makeObst('PLAIN', wallXb)];
      service.holes = [];
      service.renderObsts();
      const base = normalWindingAgreement(service.opaqueMesh);

      service.obsts = [makeObst('WITH_HOLE', wallXb)];
      service.holes = [makeHole('DOOR', doorXb)];
      service.renderObsts();
      const cut = normalWindingAgreement(service.ownMeshFor('WITH_HOLE-uuid'));

      expect(base).toBeGreaterThanOrEqual(0);
      expect(cut)
        .withContext(`base box ${(base * 100).toFixed(0)}% of triangles agree, cut obst ${(cut * 100).toFixed(0)}%`)
        .toBeCloseTo(base, 6);
    });

    it('cuts the opening out rather than drawing the obst solid', () => {
      // A 4 x 0.2 x 3 m wall is 2.4 m3; a 1 m doorway 2.1 m high through its
      // whole thickness takes 0.42 m3 away.
      service.obsts = [makeObst('WITH_HOLE', wallXb)];
      service.holes = [makeHole('DOOR', doorXb)];

      service.renderObsts();

      const mesh = service.ownMeshFor('WITH_HOLE-uuid');
      const volume = Math.abs(signedVolume(mesh.getVerticesData('position'), mesh.getIndices()));
      expect(volume).toBeCloseTo(1.98, 3);
    });
  });

  describe('scene registry', () => {
    const wallXb = { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 };

    it('registers every obst it draws, by uuid', () => {
      service.obsts = [
        makeObst('W1', wallXb),
        makeObst('W2', { x1: 0.0, x2: 0.2, y1: 0.0, y2: 4.0, z1: 0.0, z2: 3.0 })
      ];
      service.holes = [];

      service.renderObsts();

      expect(registry.entryFor('W1-uuid')).toBeTruthy();
      expect(registry.entryFor('W2-uuid')).toBeTruthy();
      expect(registry.entryFor('W1-uuid').mesh).toBe(service.opaqueMesh);
    });

    it('maps an instance back to the obst that occupies it', () => {
      service.obsts = [makeObst('W1', wallXb), makeObst('W2', wallXb)];
      service.holes = [];

      service.renderObsts();

      expect(registry.uuidAtInstance(service.opaqueMesh, 0)).toBe('W1-uuid');
      expect(registry.uuidAtInstance(service.opaqueMesh, 1)).toBe('W2-uuid');
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

      expect(service.opaqueMesh).withContext('precondition: a pool was built').toBeTruthy();

      service.resetSceneState();

      expect(service.opaqueMesh).toBeUndefined();
      expect(service.transparentMesh).toBeUndefined();
      expect(service.jsonMesh).toBeNull();
      expect(service.vertices.length).toBe(0);
      expect(service.indices.length).toBe(0);
      expect(service.positions.length).toBe(0);
    });

    it('leaves the service able to draw into the next scene', () => {
      service.obsts = [makeObst('W1', { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 })];
      service.holes = [];
      service.renderObsts();

      service.resetSceneState();
      service.renderObsts();

      expect(service.opaqueMesh).toBeTruthy();
      expect(service.opaqueMesh.thinInstanceCount).toBe(1);
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

    it('moves a clip slider without throwing', () => {
      expect(() => service.clip(50, 'x')).not.toThrow();
      expect(() => service.clip(50, 'y')).not.toThrow();
      expect(() => service.clip(50, 'z')).not.toThrow();
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
      registry = TestBed.inject(SceneRegistryService);
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
      const cap = scene.getMeshByName('obstBackCapOpaque');

      service.toggleWireframe();
      expect(service.opaqueMesh.material.wireframe).withContext('first click, wireframe').toBe(true);
      expect(cap.isVisible).withContext('first click, back cap').toBe(false);

      service.toggleWireframe();
      expect(service.opaqueMesh.material.wireframe).withContext('second click, wireframe').toBe(false);
      expect(cap.isVisible).withContext('second click, back cap').toBe(true);
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

      expect(service.opaqueMesh.material.wireframe).toBe(true);
      expect(scene.getMeshByName('obstBackCapOpaque').isVisible).toBe(false);
    });

    it('pushes the back cap in front of the surface it fills', async () => {
      // The cap is drawn from the same triangles as the obst, so at equal depth
      // the two z-fight and the cap's red bleeds through the whole model instead
      // of showing only where a clipping plane cuts into it.
      service.obsts = [makeObst('W1', { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 })];
      service.holes = [];
      service.renderObsts();
      await settleMaterials();

      const cap = scene.getMeshByName('obstBackCapOpaque');
      expect(cap.material.zOffset).toBeLessThan(0);
      expect(service.opaqueMesh.material.zOffset)
        .withContext('the solid surface itself stays where it is')
        .toBe(0);
    });

    it('carries clip values set before the materials arrived', async () => {
      TestBed.inject(SceneBoundsService).setFrom([{ x1: 0, x2: 10, y1: 0, y2: 8, z1: 0, z2: 4 }]);
      service.clip(5, 'x');

      service.obsts = [makeObst('W1', { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 })];
      service.holes = [];
      service.renderObsts();
      await settleMaterials();

      // The slider carries the coordinate itself, not a fraction (ADR-0002), so
      // the shader is handed five metres. ShaderMaterial exposes no getter for a
      // uniform, hence the private read.
      expect(service.clipPlane('x')).toBe(5);
      expect((service.opaqueMesh.material as any)._floats.clipX)
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
      // One opaque and one glazed wall, so every path is in play
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
    it('builds the back cap for the pool of plain walls', () => {
      service.obsts = [makeObst('WALL', { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 })];
      service.holes = [];

      service.renderObsts();

      const cap = scene.getMeshByName('obstBackCapOpaque') as BABYLON.Mesh;
      expect(cap).toBeTruthy();
      expect(cap.thinInstanceCount)
        .withContext('one cap instance per obst in the pool')
        .toBe(1);
    });

    it('builds the back cap for a wall that has a doorway cut out of it', async () => {
      // Without the back cap the clipped cross-section renders hollow instead of
      // solid red - and an obst with an opening is off the pool, so it needs one
      // of its own.
      await BABYLON.InitializeCSG2Async({ manifoldUrl: '/assets/manifold' });

      service.obsts = [makeObst('WALL', { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 })];
      service.holes = [makeHole('DOOR', { x1: 1.0, x2: 2.0, y1: 1.9, y2: 2.3, z1: 0.0, z2: 2.1 })];

      service.renderObsts();

      expect(service.ownMeshFor('WALL-uuid')).toBeTruthy();
      expect(scene.getMeshByName('obstBackCap_WALL-uuid')).toBeTruthy();
    });

    it('draws an obst that forbids holes as a plain instanced box', () => {
      // PERMIT_HOLE=.FALSE. means FDS ignores the opening, so the preview has to
      // as well - even though the boxes overlap.
      const sealed: SceneObst = {
        ...makeObst('SEALED', { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 }),
        permitHole: false
      };
      service.obsts = [sealed];
      service.holes = [makeHole('DOOR', { x1: 1.0, x2: 2.0, y1: 1.9, y2: 2.3, z1: 0.0, z2: 2.1 })];

      service.renderObsts();

      expect(service.ownMeshFor('SEALED-uuid')).toBeUndefined();
      expect(service.opaqueMesh.thinInstanceCount).toBe(1);
    });
  });
});
