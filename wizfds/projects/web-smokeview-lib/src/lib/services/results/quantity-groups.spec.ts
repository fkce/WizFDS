import { SmvResultFile, SmvSliceBounds } from '../parsers/smv/smv-file';
import { groupResults, isLoadableSliceGroup } from './quantity-groups';

// Grouping is the one place the catalog decides what a person is looking at:
// a case writes hundreds of files and the reader shows a handful of things.
// These tests pin down what counts as "one thing".
describe('groupResults', () => {

  let written = 0;

  /** A catalog entry, with only what a given test is about spelled out. */
  const entry = (fields: Partial<SmvResultFile>): SmvResultFile => ({
    kind: 'slcf',
    meshIndex: 1,
    filename: `demo_${++written}.sf`,
    longLabel: 'TEMPERATURE',
    shortLabel: 'temp',
    unit: 'C',
    cellCentered: false,
    ...fields
  });

  /** A plane normal to Z, sitting on cell layer `k`. */
  const planeK = (k: number): SmvSliceBounds =>
    ({ i1: 0, i2: 4, j1: 0, j2: 2, k1: k, k2: k });

  const labelsOf = (results: readonly SmvResultFile[], kind = 'slcf'): readonly string[] =>
    groupResults(results).filter(format => format.kind === kind)[0].groups.map(group => group.label);

  it('gathers one quantity from every mesh into a single group', () => {
    const groups = groupResults([
      entry({ kind: 'bndf', meshIndex: 1, longLabel: 'WALL TEMPERATURE' }),
      entry({ kind: 'bndf', meshIndex: 2, longLabel: 'WALL TEMPERATURE' })
    ])[0].groups;

    expect(groups.length).toBe(1);
    expect(groups[0].label).toBe('WALL TEMPERATURE');
    expect(groups[0].files.length).toBe(2);
    expect(groups[0].unit).toBe('C');
  });

  it('splits one quantity into a group per slice plane', () => {
    // The same TEMPERATURE at two heights is two things to look at, not one
    expect(labelsOf([
      entry({ ior: 3, bounds: planeK(2) }),
      entry({ ior: 3, bounds: planeK(12) })
    ])).toEqual(['TEMPERATURE, K=2', 'TEMPERATURE, K=12']);
  });

  it('keeps one plane together however many meshes it crosses', () => {
    const groups = groupResults([
      entry({ meshIndex: 1, ior: 3, bounds: planeK(2) }),
      entry({ meshIndex: 2, ior: 3, bounds: planeK(2) })
    ])[0].groups;

    expect(groups.length).toBe(1);
    expect(groups[0].files.length).toBe(2);
  });

  it('names the plane after the axis its ior points along', () => {
    expect(labelsOf([
      entry({ ior: 1, bounds: { i1: 5, i2: 5, j1: 0, j2: 2, k1: 0, k2: 4 } }),
      entry({ ior: 2, bounds: { i1: 0, i2: 4, j1: 3, j2: 3, k1: 0, k2: 4 } })
    ])).toEqual(['TEMPERATURE, I=5', 'TEMPERATURE, J=3']);
  });

  it('reads a negative ior as the same plane, since the sign is only which way it faces', () => {
    const groups = groupResults([
      entry({ ior: 3, bounds: planeK(2) }),
      entry({ ior: -3, bounds: planeK(2) })
    ])[0].groups;

    expect(groups.length).toBe(1);
    expect(groups[0].label).toBe('TEMPERATURE, K=2');
  });

  it('keeps the same quantity on the same plane apart when it was sampled differently', () => {
    // A group is what a reader loads in one go, and there is no stitching a
    // cell-centered shard onto a node-centered one - different numbers, on
    // different points
    expect(labelsOf([
      entry({ ior: 3, bounds: planeK(2), cellCentered: false }),
      entry({ ior: 3, bounds: planeK(2), cellCentered: true })
    ])).toEqual(['TEMPERATURE, K=2', 'TEMPERATURE, K=2 (cell)']);
  });

  it('leaves a volume slice grouped by its quantity alone', () => {
    // ior 0 spans cells in every direction, so there is no plane to name
    expect(labelsOf([
      entry({ ior: 0, bounds: { i1: 0, i2: 4, j1: 0, j2: 2, k1: 0, k2: 4 } })
    ])).toEqual(['TEMPERATURE']);
  });

  it('names a particle group after its file, since the .smv gives it no quantity', () => {
    const formats = groupResults([
      entry({ kind: 'prt5', filename: 'demo_1.prt5', longLabel: '', unit: '' }),
      entry({ kind: 'prt5', filename: 'demo_2.prt5', longLabel: '', unit: '' })
    ]);

    expect(formats[0].groups.map(group => group.label))
      .toEqual(['demo_1.prt5', 'demo_2.prt5']);
  });

  it('lists the shards of a group in mesh order, whatever order the .smv named them in', () => {
    const groups = groupResults([
      entry({ meshIndex: 3, ior: 3, bounds: planeK(2) }),
      entry({ meshIndex: 1, ior: 3, bounds: planeK(2) }),
      entry({ meshIndex: 2, ior: 3, bounds: planeK(2) })
    ])[0].groups;

    expect(groups[0].files.map(file => file.meshIndex)).toEqual([1, 2, 3]);
  });

  it('lists the formats in reading order, and only the ones the case wrote', () => {
    const formats = groupResults([
      entry({ kind: 'isof', longLabel: 'TEMPERATURE' }),
      entry({ kind: 'bndf', longLabel: 'WALL TEMPERATURE' }),
      entry({ kind: 'slcf', ior: 3, bounds: planeK(2) })
    ]);

    expect(formats.map(format => format.kind)).toEqual(['slcf', 'bndf', 'isof']);
  });

  it('has nothing to say about a case that wrote nothing', () => {
    expect(groupResults([])).toEqual([]);
  });

  describe('isLoadableSliceGroup', () => {
    const groupOf = (fields: Partial<SmvResultFile>) => ({
      label: 'TEMPERATURE', unit: 'C',
      files: [entry({ bounds: planeK(1), ior: 3, ...fields })]
    });

    it('accepts a node-centered plane slice', () => {
      expect(isLoadableSliceGroup(groupOf({}))).toBeTrue();
    });

    it('accepts a plane spelled with a negative ior', () => {
      expect(isLoadableSliceGroup(groupOf({ ior: -3 }))).toBeTrue();
    });

    it('rejects cell-centered groups until #159', () => {
      expect(isLoadableSliceGroup(groupOf({ cellCentered: true }))).toBeFalse();
    });

    it('rejects volume slices until #160', () => {
      expect(isLoadableSliceGroup(groupOf({ ior: 0 }))).toBeFalse();
    });

    it('rejects other formats', () => {
      expect(isLoadableSliceGroup(groupOf({ kind: 'bndf' }))).toBeFalse();
    });
  });
});
