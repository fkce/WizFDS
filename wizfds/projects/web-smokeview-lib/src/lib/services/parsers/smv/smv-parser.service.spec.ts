import { SmvParserService } from './smv-parser.service';
import { smvFixture } from './smv.fixture';

// The format truth is WRITE_SMOKEVIEW_FILE in FDS's dump.f90; the fixture
// mirrors its WRITE statements line for line. What these tests pin down is the
// mapping onto the SceneInput contract - metres in, metres out (ADR-0002),
// and the result-file catalog Phase 6 (#89/#148) reads.
describe('SmvParserService', () => {
  let parser: SmvParserService;

  beforeEach(() => {
    parser = new SmvParserService();
  });

  describe('header', () => {
    it('reads the CHID and the title', () => {
      const smv = parser.parse(smvFixture());
      expect(smv.chid).toBe('demo');
      expect(smv.title).toBe('Fixture case');
    });

    it('survives CRLF line endings, as FDS on Windows writes them', () => {
      const smv = parser.parse(smvFixture().replace(/\n/g, '\r\n'));
      expect(smv.chid).toBe('demo');
      expect(smv.scene.obsts.length).toBe(2);
    });
  });

  describe('meshes', () => {
    it('builds a SceneMesh from GRID and PDIM, in metres', () => {
      const smv = parser.parse(smvFixture());

      expect(smv.scene.meshes.length).toBe(1);
      const mesh = smv.scene.meshes[0];
      expect(mesh.id).toBe('MESH-1');
      expect(mesh.uuid).toBeTruthy();
      expect(mesh.xb).toEqual({ x1: 0, x2: 2, y1: 0, y2: 1, z1: 0, z2: 1 });
    });

    it('derives the cell size from PDIM and GRID', () => {
      const mesh = parser.parse(smvFixture()).scene.meshes[0];
      // 2 m over 4 cells, 1 m over 2 cells
      expect(mesh.cell).toEqual({ i: 0.5, j: 0.5, k: 0.5 });
    });

    it('keeps the raw TRN plane coordinates outside the scene contract', () => {
      const smv = parser.parse(smvFixture());

      expect(smv.grids.length).toBe(1);
      expect(smv.grids[0].x).toEqual([0, 0.5, 1, 1.5, 2]);
      expect(smv.grids[0].y).toEqual([0, 0.5, 1]);
      expect(smv.grids[0].z).toEqual([0, 0.5, 1]);
    });
  });

  describe('obsts', () => {
    it('reads the box in metres and the label after the bang', () => {
      const obsts = parser.parse(smvFixture()).scene.obsts;

      expect(obsts.length).toBe(2);
      expect(obsts[0].id).toBe('WALL_A');
      expect(obsts[0].xb).toEqual({ x1: 0, x2: 0.5, y1: 0, y2: 1, z1: 0, z2: 0.5 });
    });

    it('colours an obst from the SURFACE its faces name', () => {
      const obst = parser.parse(smvFixture()).scene.obsts[0];
      // Every face of WALL_A names surface 1 - WALL - so its colour and name apply
      expect(obst.color).toEqual({ r: 0.5, g: 0.6, b: 0.7, a: 1 });
      expect(obst.surfId).toBe('WALL');
    });

    it('takes the inline rgba when the colour indicator is -3', () => {
      const painted = parser.parse(smvFixture()).scene.obsts[1];
      expect(painted.id).toBe('PAINTED');
      expect(painted.color).toEqual({ r: 0.1, g: 0.2, b: 0.3, a: 1 });
      // Painted over, so no single surface names it
      expect(painted.surfId).toBe('');
    });
  });

  describe('vents', () => {
    it('draws a solid vent coloured by its surface', () => {
      const vents = parser.parse(smvFixture()).scene.vents;

      expect(vents.length).toBe(1);
      expect(vents[0].xb).toEqual({ x1: 0, x2: 0, y1: 0, y2: 1, z1: 0, z2: 1 });
      expect(vents[0].color).toEqual({ r: 0.5, g: 0.6, b: 0.7, a: 1 });
    });

    it('puts an OPEN vent - negative colour index - on the opens list', () => {
      const scene = parser.parse(smvFixture()).scene;

      expect(scene.opens.length).toBe(1);
      expect(scene.opens[0].xb).toEqual({ x1: 2, x2: 2, y1: 0, y2: 1, z1: 0, z2: 1 });
    });

    it('skips the exterior patches FDS appends to fill mesh boundaries', () => {
      const scene = parser.parse(smvFixture()).scene;
      // 3 entries in the VENT block, 1 of them an exterior patch
      expect(scene.vents.length + scene.opens.length).toBe(2);
    });
  });

  describe('devices', () => {
    it('reads a point device as a zero-extent box where it stands', () => {
      const devcs = parser.parse(smvFixture()).scene.devcs;

      expect(devcs.length).toBe(2);
      expect(devcs[0].id).toBe('TC_1');
      expect(devcs[0].extent).toBe('point');
      expect(devcs[0].marker).toBe('sensor');
      expect(devcs[0].xb).toEqual({ x1: 1, x2: 1, y1: 0.5, y2: 0.5, z1: 0.8, z2: 0.8 });
    });

    it('reads a device with an XB after the hash as its volume', () => {
      const beam = parser.parse(smvFixture()).scene.devcs[1];

      expect(beam.id).toBe('BEAM_1');
      expect(beam.extent).toBe('volume');
      expect(beam.xb).toEqual({ x1: 0.5, x2: 1.5, y1: 0.25, y2: 0.75, z1: 0.8, z2: 1 });
    });

    it('picks the marker from what the device measures', () => {
      // CHAMBER OBSCURATION is what a smoke detector reports
      expect(parser.parse(smvFixture()).scene.devcs[1].marker).toBe('smoke detector');
    });
  });

  describe('result-file catalog', () => {
    it('lists a node-centered slice with its bounds and orientation', () => {
      const slice = parser.parse(smvFixture()).results
        .filter(entry => entry.kind === 'slcf')[0];

      expect(slice.meshIndex).toBe(1);
      expect(slice.filename).toBe('demo_1_1.sf');
      expect(slice.longLabel).toBe('TEMPERATURE');
      expect(slice.shortLabel).toBe('temp');
      expect(slice.unit).toBe('C');
      expect(slice.cellCentered).toBe(false);
      expect(slice.bounds).toEqual({ i1: 0, i2: 4, j1: 1, j2: 1, k1: 0, k2: 2 });
      expect(slice.ior).toBe(2);
    });

    it('marks an SLCC entry cell-centered', () => {
      const slices = parser.parse(smvFixture()).results
        .filter(entry => entry.kind === 'slcf');
      expect(slices.length).toBe(2);
      expect(slices[1].filename).toBe('demo_1_2.sf');
      expect(slices[1].cellCentered).toBe(true);
    });

    it('lists the boundary file with its labels', () => {
      const bndf = parser.parse(smvFixture()).results
        .filter(entry => entry.kind === 'bndf')[0];

      expect(bndf.filename).toBe('demo_1_1.bf');
      expect(bndf.longLabel).toBe('WALL TEMPERATURE');
      expect(bndf.unit).toBe('C');
    });

    it('lists the particle file', () => {
      const prt5 = parser.parse(smvFixture()).results
        .filter(entry => entry.kind === 'prt5')[0];
      expect(prt5.meshIndex).toBe(1);
      expect(prt5.filename).toBe('demo_1.prt5');
    });

    it('lists the smoke file with its mass extinction coefficient', () => {
      const smoke = parser.parse(smvFixture()).results
        .filter(entry => entry.kind === 'smoke3d')[0];
      expect(smoke.filename).toBe('demo_1_1.s3d');
      expect(smoke.extinctionCoefficient).toBeCloseTo(8.7);
    });

    it('lists the isosurface file', () => {
      const isof = parser.parse(smvFixture()).results
        .filter(entry => entry.kind === 'isof')[0];
      expect(isof.filename).toBe('demo_1_1.iso');
      expect(isof.longLabel).toBe('TEMPERATURE');
    });
  });

  describe('what the .smv does not carry', () => {
    it('leaves the lists the master file has no elements for empty', () => {
      const scene = parser.parse(smvFixture()).scene;
      expect(scene.holes).toEqual([]);
      expect(scene.fires).toEqual([]);
      expect(scene.jetfans).toEqual([]);
      expect(scene.inits).toEqual([]);
      expect(scene.zones).toEqual([]);
      // GEOM points at a separate binary file; parsing it is Phase 6 work
      expect(scene.geoms).toEqual([]);
    });
  });
});
