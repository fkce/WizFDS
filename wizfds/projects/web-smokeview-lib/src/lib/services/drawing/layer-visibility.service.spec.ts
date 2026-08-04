import { TestBed } from '@angular/core/testing';

import { LayerVisibilityService } from './layer-visibility.service';

/**
 * One register of what each layer currently shows.
 *
 * The drawing services each count visibility in a numbering of their own; this
 * is where those numbers become the three words the rest of the system speaks -
 * the ribbon reads its icons off it, and a pick refuses what it says is hidden.
 */
describe('LayerVisibilityService', () => {
  let layers: LayerVisibilityService;

  beforeEach(() => {
    layers = TestBed.inject(LayerVisibilityService);
  });

  it('answers with what the bound layer says', () => {
    let state: 'edges' | 'filled' | 'hidden' = 'filled';
    layers.bind('mesh', () => state);

    expect(layers.stateOf('mesh')).toBe('filled');
    state = 'hidden';
    expect(layers.stateOf('mesh')).toBe('hidden');
  });

  it('treats a type nothing has bound as filled', () => {
    // An obst has no visibility button, and nothing may make it unpickable
    expect(layers.stateOf('obst')).toBe('filled');
  });

  it('keeps one answer per type, the last one bound', () => {
    layers.bind('vent', () => 'edges');
    layers.bind('vent', () => 'hidden');

    expect(layers.stateOf('vent')).toBe('hidden');
  });
});
