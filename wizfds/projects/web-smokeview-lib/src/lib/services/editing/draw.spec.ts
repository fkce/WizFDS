import {
    boxBetween, extruded, floorUnder, heightAlong, inPlaneAxes, landedAxis, rayPlane
} from './draw';
import { SceneMesh, SceneXb } from '../drawing/scene-input';

const box: SceneXb = { x1: 0, x2: 4, y1: 0, y2: 6, z1: 0, z2: 3 };

/** A mesh is a box with a grid; the grid does not matter to the arithmetic. */
function mesh(id: string, xb: SceneXb): SceneMesh {
    return { uuid: `uuid-${id}`, id: id, xb: xb, cell: { i: 0.25, j: 0.25, k: 0.25 } };
}

describe('landedAxis', () => {

    it('answers z for a point on the top face', () => {
        expect(landedAxis(box, { x: 2, y: 3, z: 3 })).toBe('z');
    });

    it('answers z for a point on the bottom face', () => {
        expect(landedAxis(box, { x: 2, y: 3, z: 0 })).toBe('z');
    });

    it('answers x for a point on a side wall', () => {
        expect(landedAxis(box, { x: 4, y: 3, z: 1.5 })).toBe('x');
    });

    it('answers y for a point on the other pair of walls', () => {
        expect(landedAxis(box, { x: 2, y: 0, z: 1.5 })).toBe('y');
    });

    // A pick lands within floating-point error of the surface, never exactly on it
    it('tolerates a point slightly off the face', () => {
        expect(landedAxis(box, { x: 2, y: 3, z: 3.0000001 })).toBe('z');
    });
});

describe('inPlaneAxes', () => {

    it('leaves out the axis the plane is flat on', () => {
        expect(inPlaneAxes('x')).toEqual(['y', 'z']);
        expect(inPlaneAxes('y')).toEqual(['x', 'z']);
        expect(inPlaneAxes('z')).toEqual(['x', 'y']);
    });
});

describe('rayPlane', () => {

    it('meets an axis-aligned plane where the arithmetic says', () => {
        const hit = rayPlane(
            { origin: { x: 0, y: 0, z: 10 }, direction: { x: 0, y: 0, z: -1 } }, 'z', 2);
        expect(hit).toEqual({ x: 0, y: 0, z: 2 });
    });

    it('answers null for a plane behind the ray', () => {
        const hit = rayPlane(
            { origin: { x: 0, y: 0, z: 10 }, direction: { x: 0, y: 0, z: 1 } }, 'z', 2);
        expect(hit).toBeNull();
    });

    it('answers null for a ray parallel to the plane', () => {
        const hit = rayPlane(
            { origin: { x: 0, y: 0, z: 10 }, direction: { x: 1, y: 0, z: 0 } }, 'z', 2);
        expect(hit).toBeNull();
    });
});

describe('floorUnder', () => {

    const meshes = [
        mesh('MESH1', { x1: 0, x2: 10, y1: 0, y2: 10, z1: 0, z2: 3 }),
        mesh('MESH2', { x1: 20, x2: 30, y1: 0, y2: 10, z1: 1, z2: 4 })
    ];

    it('lands on the floor of the mesh the cursor is over', () => {
        const hit = floorUnder(
            { origin: { x: 5, y: 5, z: 10 }, direction: { x: 0, y: 0, z: -1 } }, meshes);
        expect(hit).toEqual({ x: 5, y: 5, z: 0 });
    });

    it('lands on the other floor when the cursor is over that mesh', () => {
        const hit = floorUnder(
            { origin: { x: 25, y: 5, z: 10 }, direction: { x: 0, y: 0, z: -1 } }, meshes);
        expect(hit).toEqual({ x: 25, y: 5, z: 1 });
    });

    // "Where there is nothing under the cursor, on the floor of the nearest &MESH"
    it('falls back to the nearest floor plane when the cursor is over neither', () => {
        const hit = floorUnder(
            { origin: { x: 12, y: 5, z: 10 }, direction: { x: 0, y: 0, z: -1 } }, meshes);
        expect(hit).toEqual({ x: 12, y: 5, z: 0 });
    });

    it('answers null with no meshes to land on', () => {
        const hit = floorUnder(
            { origin: { x: 5, y: 5, z: 10 }, direction: { x: 0, y: 0, z: -1 } }, []);
        expect(hit).toBeNull();
    });

    it('answers null when the ray never meets a floor plane', () => {
        const hit = floorUnder(
            { origin: { x: 5, y: 5, z: 10 }, direction: { x: 1, y: 0, z: 0 } }, meshes);
        expect(hit).toBeNull();
    });
});

describe('boxBetween', () => {

    it('spans the two corners, whichever way round they were given', () => {
        const base = boxBetween({ x: 4, y: 1, z: 0 }, { x: 1, y: 5, z: 0 }, 'z');
        expect(base).toEqual({ x1: 1, x2: 4, y1: 1, y2: 5, z1: 0, z2: 0 });
    });

    it('is flat on the given axis at the first corner', () => {
        // The second corner's x is ignored: the rectangle lies in the wall's plane
        const base = boxBetween({ x: 4, y: 1, z: 1 }, { x: 7, y: 5, z: 2.5 }, 'x');
        expect(base).toEqual({ x1: 4, x2: 4, y1: 1, y2: 5, z1: 1, z2: 2.5 });
    });
});

describe('extruded', () => {

    const base: SceneXb = { x1: 1, x2: 4, y1: 1, y2: 5, z1: 0, z2: 0 };

    it('grows the base upwards by a positive height', () => {
        expect(extruded(base, 'z', 2.5)).toEqual({ x1: 1, x2: 4, y1: 1, y2: 5, z1: 0, z2: 2.5 });
    });

    it('grows it downwards by a negative one, keeping XB ordered', () => {
        expect(extruded(base, 'z', -2)).toEqual({ x1: 1, x2: 4, y1: 1, y2: 5, z1: -2, z2: 0 });
    });

    it('leaves a zero height flat - FDS warns about that, it does not forbid it', () => {
        expect(extruded(base, 'z', 0)).toEqual(base);
    });
});

describe('heightAlong', () => {

    it('reads the height where the ray passes the vertical line', () => {
        // A ray aimed horizontally at height 2 crosses the line through (0,0) there
        const z = heightAlong(
            { origin: { x: 10, y: 0, z: 2 }, direction: { x: -1, y: 0, z: 0 } },
            { x: 0, y: 0, z: 0 });
        expect(z).toBeCloseTo(2, 6);
    });

    it('follows an oblique ray to where it comes nearest the line', () => {
        // From (10,0,0) towards (-1,0,1): nearest the z-axis at x=0, so z=10
        const z = heightAlong(
            { origin: { x: 10, y: 0, z: 0 }, direction: { x: -1, y: 0, z: 1 } },
            { x: 0, y: 0, z: 0 });
        expect(z).toBeCloseTo(10, 6);
    });

    it('answers null for a ray parallel to the line', () => {
        const z = heightAlong(
            { origin: { x: 10, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } },
            { x: 0, y: 0, z: 0 });
        expect(z).toBeNull();
    });
});
