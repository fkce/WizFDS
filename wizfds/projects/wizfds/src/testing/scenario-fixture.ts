/**
 * A scenario with one of everything the 3D preview can draw, in a 10 x 8 x 4 m
 * room: a mesh, two obsts with different &SURFs, a doorway, an `OPEN` vent, a
 * ventilation vent, a fire and a jetfan.
 *
 * Every element type is present so that none of them is left crossing the
 * app/library boundary by a different route than the others.
 */
export function scenarioJson(): object {
  return {
    geometry: {
      meshes: [{ id: 'MESH', uuid: 'mesh-uuid', xb: { x1: 0, x2: 10, y1: 0, y2: 8, z1: 0, z2: 4 } }],
      surfs: [
        { id: 'WALL', color: { rgb: [200, 100, 50] }, transparency: 1 },
        { id: 'GLASS', color: { rgb: [0, 128, 255] }, transparency: 0.4 }
      ],
      obsts: [
        {
          id: 'W1', uuid: 'w1-uuid', permit_hole: true,
          xb: { x1: 0, x2: 4, y1: 2, y2: 2.2, z1: 0, z2: 3 },
          surf: { type: 'surf_id', surf_id: 'WALL' }
        },
        {
          id: 'W2', uuid: 'w2-uuid', permit_hole: false,
          xb: { x1: 6, x2: 8, y1: 2, y2: 2.2, z1: 0, z2: 3 },
          surf: { type: 'surf_id', surf_id: 'GLASS' }
        }
      ],
      holes: [{ id: 'DOOR', uuid: 'door-uuid', xb: { x1: 1, x2: 2, y1: 1.9, y2: 2.3, z1: 0, z2: 2.1 } }],
      opens: [{ id: 'OPEN', uuid: 'open-uuid', xb: { x1: 0, x2: 4, y1: 0, y2: 0, z1: 0, z2: 3 } }]
    },
    ventilation: {
      surfs: [{ id: 'SUPPLY', color: { rgb: [10, 200, 30] }, transparency: 0.5 }],
      vents: [{
        id: 'V1', uuid: 'v1-uuid', surf_id: 'SUPPLY',
        xb: { x1: 0, x2: 2, y1: 0, y2: 2, z1: 1, z2: 1 }
      }],
      jetfans: [{
        id: 'JF1', uuid: 'jf1-uuid', direction: '-z', transparency: 0.5,
        color: { rgb: [255, 0, 0] },
        xb: { x1: 2, x2: 8, y1: 3, y2: 5, z1: 1, z2: 3 }
      }]
    },
    fires: {
      fires: [{
        id: 'F1', uuid: 'f1-uuid',
        surf: { color: { rgb: [255, 128, 0] } },
        vent: { xb: { x1: 1, x2: 3, y1: 1, y2: 3, z1: 0, z2: 0 } }
      }]
    }
  };
}
