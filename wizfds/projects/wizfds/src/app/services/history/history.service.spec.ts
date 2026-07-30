import { TestBed } from '@angular/core/testing';

import { HistoryService, MAX_HISTORY_DEPTH } from './history.service';
import { ElementPatch, HistoryEntry } from './element-patch';
import { MainService } from '@services/main/main.service';
import { FdsScenario } from '@services/fds-scenario/fds-scenario';
import { appServiceProviders } from '../../../testing/app-service-testing';

/** A patch that changes one obst's box, with the two states filled in. */
function patch(uuid: string, before: number, after: number): ElementPatch {
  return {
    uuid: uuid,
    collection: 'obst',
    index: 0,
    before: { uuid: uuid, xb: { x1: before } },
    after: { uuid: uuid, xb: { x1: after } }
  };
}

/** One gesture, however many elements it touched. */
function entry(label: string, patches: ElementPatch[]): HistoryEntry {
  return { label: label, patches: patches };
}

/**
 * Undo and redo, as a stack of element patches (#123, ADR-0009).
 *
 * A patch and not a snapshot of the scenario: at the ten thousand obsts this is
 * built for, a `toJSON()` of the whole `Fds` per step is megabytes. And one
 * gesture is one entry, so a move of a hundred elements undoes as one.
 */
describe('HistoryService', () => {
  let service: HistoryService;
  let mainService: MainService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...appServiceProviders()] });
    service = TestBed.inject(HistoryService);
    mainService = TestBed.inject(MainService);
  });

  it('has nothing to undo or redo to begin with', () => {
    expect(service.canUndo).toBe(false);
    expect(service.canRedo).toBe(false);
  });

  it('hands back the entry that was pushed, to undo it', () => {
    const moved = entry('Move', [patch('a', 0, 1)]);
    service.push(moved);

    expect(service.undo()).toBe(moved);
  });

  it('has nothing left to undo once the only entry has been undone', () => {
    service.push(entry('Move', [patch('a', 0, 1)]));

    service.undo();

    expect(service.canUndo).toBe(false);
    expect(service.canRedo).toBe(true);
  });

  it('hands the undone entry back again, to redo it', () => {
    const moved = entry('Move', [patch('a', 0, 1)]);
    service.push(moved);
    service.undo();

    expect(service.redo()).toBe(moved);
    expect(service.canUndo).toBe(true);
  });

  it('undoes the most recent gesture first', () => {
    service.push(entry('first', [patch('a', 0, 1)]));
    service.push(entry('second', [patch('b', 0, 1)]));

    expect(service.undo().label).toBe('second');
    expect(service.undo().label).toBe('first');
  });

  it('answers with nothing when there is nothing to undo', () => {
    expect(service.undo()).toBeUndefined();
    expect(service.redo()).toBeUndefined();
  });

  it('drops what could be redone as soon as a new gesture is made', () => {
    // The branch the user left is no longer reachable: redoing onto a scenario
    // that has since changed would restore an element out of a state it was
    // never in.
    service.push(entry('first', [patch('a', 0, 1)]));
    service.undo();

    service.push(entry('another', [patch('b', 0, 1)]));

    expect(service.canRedo).toBe(false);
  });

  it('keeps one gesture as one entry however many elements it touched', () => {
    // A move of a multiple selection, or an array of a hundred copies: undo
    // takes the whole operation back, not one element at a time.
    const gesture = entry('Move', [patch('a', 0, 1), patch('b', 0, 1), patch('c', 0, 1)]);
    service.push(gesture);

    expect(service.undo().patches.length).toBe(3);
    expect(service.canUndo).toBe(false);
  });

  it('forgets the oldest gesture once it is full', () => {
    // The memory cost is one element per patch, and an array command puts a
    // hundred of them in one entry - so the depth is capped rather than left to
    // grow for as long as the scenario is open.
    for (let i = 0; i <= MAX_HISTORY_DEPTH; i++) {
      service.push(entry(`gesture ${i}`, [patch('a', i, i + 1)]));
    }

    const undone: string[] = [];
    while (service.canUndo) { undone.push(service.undo().label); }

    expect(undone.length).toBe(MAX_HISTORY_DEPTH);
    expect(undone[undone.length - 1]).toBe('gesture 1');
  });

  describe('what the buttons say', () => {
    it('names the gesture that would be undone', () => {
      service.push(entry('Move', [patch('a', 0, 1)]));

      expect(service.undoLabel).toBe('Move');
    });

    it('names the gesture that would be redone', () => {
      service.push(entry('Move', [patch('a', 0, 1)]));
      service.undo();

      expect(service.redoLabel).toBe('Move');
    });

    it('names nothing when there is nothing to undo', () => {
      expect(service.undoLabel).toBeUndefined();
    });
  });

  it('starts empty again when another scenario is opened', () => {
    // Otherwise Ctrl+Z would edit a scenario the user is no longer looking at,
    // through uuids that name nothing in the one they are (ADR-0009)
    mainService.setCurrentFdsScenario(
      new FdsScenario(JSON.stringify({ id: 1, projectId: 1, name: 'first' })));
    service.push(entry('Move', [patch('a', 0, 1)]));
    service.undo();

    mainService.setCurrentFdsScenario(
      new FdsScenario(JSON.stringify({ id: 2, projectId: 1, name: 'second' })));

    expect(service.canUndo).toBe(false);
    expect(service.canRedo).toBe(false);
  });

  it('says when it changes, so the buttons can follow', () => {
    const seen: boolean[] = [];
    service.changed$.subscribe(() => seen.push(service.canUndo));

    service.push(entry('Move', [patch('a', 0, 1)]));
    service.undo();

    expect(seen).toEqual([true, false]);
  });

  it('stays quiet when there was nothing to clear', () => {
    // Opening the first scenario of a session clears an empty stack, and the
    // buttons have no reason to be told about that
    let announced = 0;
    service.changed$.subscribe(() => announced++);

    service.clear();

    expect(announced).toBe(0);
  });
});
