import { SmvResultFile, SmvResultKind } from '../parsers/smv/smv-file';

/**
 * The files of one physical quantity - and, for a slice, one position - across
 * every mesh of the case.
 *
 * This is the unit a person picks from and a reader loads: FDS writes one
 * shard per mesh, but nobody wants to look at "the temperature on mesh 3",
 * they want the temperature on that plane, and the reader stitches the shards
 * back together to give it to them. So the catalog lists groups, not files.
 */
export interface QuantityGroup {
    /**
     * What the group is called, and what it is keyed on: two files a viewer
     * would show under one heading are one group, and the heading is the only
     * thing that decides it.
     */
    readonly label: string,
    /** As the `.smv` spelled it; empty when the format carries no quantity. */
    readonly unit: string,
    /** One shard per mesh, in mesh order. */
    readonly files: readonly SmvResultFile[]
}

/** Everything one result format holds, which is a list of quantity groups. */
export interface ResultFormatGroup {
    readonly kind: SmvResultKind,
    readonly groups: readonly QuantityGroup[]
}

/**
 * The order the formats are listed in - slices first, because that is what a
 * fire engineer opens a case for, then the surfaces, then the rest. It is a
 * fixed order rather than the order the `.smv` happens to name them in: the
 * same case reads the same way every time, and two cases read the same way as
 * each other.
 */
const FORMAT_ORDER: readonly SmvResultKind[] = ['slcf', 'bndf', 'prt5', 'smoke3d', 'isof'];

/**
 * Turns the flat catalog of a parsed `.smv` into the format -> quantity group
 * -> file listing both hosts show (#148).
 *
 * Pure, and in the library rather than in either host, because the grouping is
 * domain logic - what belongs with what - and both the app and the standalone
 * viewer have to answer it identically. The wording and the pixels stay with
 * the hosts (ADR-0010).
 */
export function groupResults(results: readonly SmvResultFile[]): readonly ResultFormatGroup[] {
  // A Map hands its keys back in the order they first arrived, which is the
  // whole of the ordering inside a format: the groups come out in the order
  // the .smv named them, and only the formats themselves are put in an order
  // of our own.
  const byKind = new Map<SmvResultKind, Map<string, SmvResultFile[]>>();

  for (const entry of results) {
    let groups = byKind.get(entry.kind);
    if (groups === undefined) {
      groups = new Map<string, SmvResultFile[]>();
      byKind.set(entry.kind, groups);
    }

    const label = labelOf(entry);
    const files = groups.get(label);
    if (files === undefined) {
      groups.set(label, [entry]);
    }
    else {
      files.push(entry);
    }
  }

  return FORMAT_ORDER
    .filter(kind => byKind.has(kind))
    .map(kind => ({
      kind: kind,
      groups: Array.from(byKind.get(kind).entries()).map(([label, files]) => ({
        label: label,
        unit: files[0].unit,
        // Mesh order, because that is the order a reader stitches the shards
        // in, and a listing that disagreed with it would be its own puzzle.
        files: files.slice().sort((a, b) => a.meshIndex - b.meshIndex)
      }))
    }));
}

/**
 * Whether #149's reader can open this group: node-centered plane slices only.
 * Cell-centered rendering is #159, volume slices (ior 0) are #160 - both are
 * listed in the catalog but stay unloadable until their issue lands. `ior`
 * may be written negative (a slice pinned to the far face of a solid), so
 * only its magnitude picks the axis.
 */
export function isLoadableSliceGroup(group: QuantityGroup): boolean {
    const first = group.files[0];
    return !!first && first.kind === 'slcf' && !first.cellCentered
        && first.ior !== undefined && [1, 2, 3].indexOf(Math.abs(first.ior)) !== -1;
}

/**
 * The heading a file is filed under, which doubles as the key it is grouped
 * by.
 *
 * A planar slice carries its position, because a case routinely holds a dozen
 * TEMPERATURE slices and the quantity alone would pile all of them into one
 * heap.
 */
function labelOf(entry: SmvResultFile): string {
  // PRT5 entries arrive with no quantity at all: what would name them is the
  // particle classes under CLASS_OF_PARTICLES, which the parser does not read.
  // The filename is then the only name there is - which also means each
  // particle file stands as a group of its own until the classes are read.
  const label = entry.longLabel || entry.filename;
  const position = positionOf(entry);
  const placed = position === null ? label : `${label}, ${position}`;

  // Where the values were sampled splits the group as firmly as the quantity
  // does. A group is what a reader loads in one go, and cell-centered values
  // sit in the middle of the cells while node-centered ones sit on the grid
  // planes - so the same TEMPERATURE written both ways is two sets of numbers
  // on two sets of points, and no reader can stitch a shard of one onto a
  // shard of the other. Short suffix because the panel it lands in is narrow.
  return entry.cellCentered ? `${placed} (cell)` : placed;
}

/**
 * Where a planar slice sits, spelled as the cell index of the plane: `K=12`.
 *
 * Cells, not metres. The `.smv` states a slice in cell indices, and the metres
 * behind them are the stretched TRN planes of `SmvMeshGrid` - which #149 reads
 * when it draws a slice on the grid the solver actually used. This label is
 * relabelled in metres there; until then an index is what the file itself says.
 *
 * `ior` names the axis the plane is normal to and may be written negative -
 * that is how FDS spells a slice pinned to the far face of a solid - so only
 * its magnitude picks the axis. A volume slice (`ior` 0) spans cells in every
 * direction and has no plane to name, so it groups by its quantity alone, as
 * does every format that is not a slice.
 */
function positionOf(entry: SmvResultFile): string | null {
  if (entry.bounds === undefined || entry.ior === undefined) { return null; }

  // The low end of the range on the axis ior names is the position: a
  // node-centered plane has both ends on it, and a cell-centered one names the
  // cell layer that starts there. Nothing here checks that the two ends agree
  // with the ior, and nothing should yet - what a .smv that disagrees with
  // itself looks like is worth learning from a real file rather than guessing
  // at, and #149 is the first code that will meet one.
  switch (Math.abs(entry.ior)) {
    case 1: return `I=${entry.bounds.i1}`;
    case 2: return `J=${entry.bounds.j1}`;
    case 3: return `K=${entry.bounds.k1}`;
    default: return null;
  }
}
