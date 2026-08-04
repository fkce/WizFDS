import { GestureInput } from './gesture';

/**
 * The numbers a gesture is showing, and the ones the user typed over them (#124).
 *
 * The dynamic input is what this project has instead of an AutoCAD command line
 * (ADR-0010): a small panel at the cursor, live while the mouse moves, and a
 * field the user can take over the moment they know the number they want.
 */
describe('GestureInput - a move', () => {

  let input: GestureInput;

  beforeEach(() => {
    input = GestureInput.forMove();
  });

  it('offers the three deltas, in the order the axes run', () => {
    expect(input.fields.map(field => field.key)).toEqual(['dx', 'dy', 'dz']);
    expect(input.fields.map(field => field.label)).toEqual(['dX', 'dY', 'dZ']);
  });

  it('follows the mouse until it is told otherwise', () => {
    input.setLive({ dx: 1.25, dy: 0, dz: 0 });

    expect(input.resolved).toEqual({ dx: 1.25, dy: 0, dz: 0 });
  });

  it('rounds what the mouse reports to the millimetre it shows', () => {
    // A readout that jitters through six decimals while the pointer sits still
    // is unreadable, and no FDS geometry is finer than a millimetre anyway.
    input.setLive({ dx: 1.2503791, dy: 0, dz: 0 });

    expect(input.resolved.dx).toBe(1.25);
  });

  it('lets a typed number take over from the mouse', () => {
    input.setLive({ dx: 1.25, dy: 0, dz: 0 });

    input.type('dx', '3');
    input.setLive({ dx: 1.9, dy: 0, dz: 0 });

    expect(input.resolved.dx).toBe(3);
  });

  it('leaves the other fields on the mouse', () => {
    // Half the point of the panel: state the one dimension that matters and go
    // on aiming the rest.
    input.type('dx', '3');
    input.setLive({ dx: 1.9, dy: 0.4, dz: 0 });

    expect(input.resolved).toEqual({ dx: 3, dy: 0.4, dz: 0 });
  });

  it('says which fields the keyboard has taken over', () => {
    input.type('dy', '2.5');

    expect(input.fields.map(field => field.typed)).toEqual([false, true, false]);
  });

  it('goes back to the mouse when the field is emptied', () => {
    input.type('dx', '3');

    input.type('dx', '');
    input.setLive({ dx: 1.9, dy: 0, dz: 0 });

    expect(input.resolved.dx).toBe(1.9);
  });

  it('ignores text that is not a number yet', () => {
    // A field mid-typing reads as `-` or `1.`, and neither is a coordinate. It
    // is not an error either - the user is still typing.
    input.setLive({ dx: 1.9, dy: 0, dz: 0 });

    input.type('dx', '-');

    expect(input.resolved.dx).toBe(1.9);
  });

  it('starts in the first field and moves on with Tab, wrapping round', () => {
    expect(input.activeKey).toBe('dx');

    input.next();
    expect(input.activeKey).toBe('dy');

    input.next();
    input.next();
    expect(input.activeKey).toBe('dx');
  });
});

/** The panel the draw gesture's first step shows - a corner, absolutely (#125). */
describe('GestureInput - a point', () => {

  it('offers the three coordinates, as absolute positions', () => {
    const input = GestureInput.forPoint();

    expect(input.fields.map(field => field.key)).toEqual(['x', 'y', 'z']);
    expect(input.fields.map(field => field.label)).toEqual(['X', 'Y', 'Z']);
  });

  it('lets a typed coordinate take over from the mouse', () => {
    const input = GestureInput.forPoint();

    input.type('z', '1.4');
    input.setLive({ x: 2, y: 3, z: 0 });

    expect(input.resolved).toEqual({ x: 2, y: 3, z: 1.4 });
  });
});

/** The same panel, confined to the axes a draw step is free on (#125). */
describe('GestureInput - chosen axes', () => {

  it('offers a delta per given axis, in the given order', () => {
    // A base drawn on a wall is free on y and z; the wall's own axis is not a field
    const input = GestureInput.forAxes(['y', 'z']);

    expect(input.fields.map(field => field.key)).toEqual(['dy', 'dz']);
    expect(input.fields.map(field => field.label)).toEqual(['dY', 'dZ']);
  });

  it('is the move panel when given all three', () => {
    const input = GestureInput.forAxes(['x', 'y', 'z']);

    expect(input.fields.map(field => field.key)).toEqual(['dx', 'dy', 'dz']);
  });
});

/** The same panel, for the one coordinate a face handle drags. */
describe('GestureInput - a face drag', () => {

  it('offers the coordinate by its own name, as an absolute position', () => {
    // Not a delta: it is the number that ends up in the `.fds` file.
    const input = GestureInput.forFace('x2', 0.4);

    expect(input.fields.map(field => field.label)).toEqual(['X2']);
    expect(input.resolved).toEqual({ x2: 0.4 });
  });

  it('has nowhere else for Tab to go', () => {
    const input = GestureInput.forFace('z1', 0);

    input.next();

    expect(input.activeKey).toBe('z1');
  });
});
