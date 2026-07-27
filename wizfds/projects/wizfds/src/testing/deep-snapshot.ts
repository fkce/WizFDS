/**
 * A structural dump of an object graph, ignoring `toJSON()`.
 *
 * `JSON.stringify(fds)` goes through `Fds.toJSON()`, which deliberately leaves
 * out the presentation fields - and those are exactly the ones the visualization
 * library used to write into, so comparing the serialised form would have called
 * that behaviour clean. This walks the private backing fields instead, so a write
 * anywhere in the model shows up.
 *
 * Cycles are cut at the point they close, which is enough for comparing two
 * snapshots of the same graph taken at different times.
 */
export function deepSnapshot(value: any, path: Set<any> = new Set()): any {
  if (value === null || typeof value !== 'object') { return value; }
  if (path.has(value)) { return '[circular]'; }
  path.add(value);
  const snapshot = Array.isArray(value)
    ? value.map(item => deepSnapshot(item, path))
    : Object.keys(value).sort().reduce((out: any, key: string) => {
      out[key] = deepSnapshot(value[key], path);
      return out;
    }, {});
  path.delete(value);
  return snapshot;
}
