import { TestBed } from '@angular/core/testing';

import { EditStreamService } from './edit-stream.service';
import { SceneEditCommand } from './edit-command';

/**
 * The way an edit leaves the library (#123).
 *
 * State comes in through `render()`, intent goes out through here, and the app
 * decides what becomes of it - the library never writes to the scenario
 * (ADR-0004).
 */
describe('EditStreamService', () => {
  let service: EditStreamService;
  let received: SceneEditCommand[];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EditStreamService);
    received = [];
  });

  it('hands a command to whoever is listening', () => {
    service.commands$.subscribe(command => received.push(command));

    service.emit({ kind: 'move', uuids: ['a'], delta: { dx: 1, dy: 0, dz: 0 } });

    expect(received).toEqual([{ kind: 'move', uuids: ['a'], delta: { dx: 1, dy: 0, dz: 0 } }]);
  });

  it('keeps the order the user made the edits in', () => {
    service.commands$.subscribe(command => received.push(command));

    service.emit({ kind: 'move', uuids: ['a'], delta: { dx: 1, dy: 0, dz: 0 } });
    service.emit({ kind: 'delete', uuids: ['a'] });

    expect(received.map(command => command.kind)).toEqual(['move', 'delete']);
  });

  it('does not replay what was emitted before a subscriber arrived', () => {
    // A replayed command would be applied a second time, to a scenario that
    // already has it - the reason this is a Subject and not a BehaviorSubject.
    service.emit({ kind: 'delete', uuids: ['a'] });

    service.commands$.subscribe(command => received.push(command));

    expect(received).toEqual([]);
  });
});
