import { TestBed } from '@angular/core/testing';

import { SelectionService } from './selection.service';
import { MainService } from '@services/main/main.service';
import { FdsScenario } from '@services/fds-scenario/fds-scenario';
import { appServiceProviders } from '../../../testing/app-service-testing';

/**
 * The one place that says what is selected (#121).
 *
 * It is keyed by `uuid` and not by `idAC`, because an element drawn in the
 * browser has no `idAC` at all (ADR-0005), and it lives in the app and not in
 * the 3D library because the forms and the CAD bridge are outside it (ADR-0004).
 */
describe('SelectionService', () => {
  let service: SelectionService;
  let mainService: MainService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...appServiceProviders()] });
    service = TestBed.inject(SelectionService);
    mainService = TestBed.inject(MainService);
  });

  it('starts with nothing selected', () => {
    expect(service.selected).toEqual([]);
  });

  it('replaces the selection by default', () => {
    service.select({ uuid: 'a', type: 'obst' });

    service.select({ uuid: 'b', type: 'vent' });

    expect(service.selectedUuids()).toEqual(['b']);
  });

  it('extends the selection when asked to', () => {
    service.select({ uuid: 'a', type: 'obst' });

    service.select({ uuid: 'b', type: 'vent' }, { add: true });

    expect(service.selectedUuids()).toEqual(['a', 'b']);
  });

  it('takes an element back out when it is selected again', () => {
    service.select({ uuid: 'a', type: 'obst' }, { add: true });

    service.select({ uuid: 'a', type: 'obst' }, { add: true });

    expect(service.selected).toEqual([]);
  });

  it('keeps what kind of element each one is', () => {
    // So a gizmo or a properties palette knows what it is acting on without
    // scanning all fourteen lists for the uuid
    service.select({ uuid: 'a', type: 'jetfan' });

    expect(service.selected[0].type).toBe('jetfan');
  });

  describe('selected$', () => {
    it('replays to a subscriber that arrives later', () => {
      // A form subscribes when the user opens it, long after the click in 3D
      service.select({ uuid: 'a', type: 'obst' });

      let seen: readonly { uuid: string }[];
      service.selected$.subscribe(selected => seen = selected);

      expect(seen.map(element => element.uuid)).toEqual(['a']);
    });

    it('emits when the selection changes', () => {
      const seen: string[][] = [];
      service.selected$.subscribe(selected => seen.push(selected.map(e => e.uuid)));

      service.select({ uuid: 'a', type: 'obst' });
      service.clear();

      expect(seen).toEqual([[], ['a'], []]);
    });

    it('stays quiet when nothing was selected and nothing is cleared', () => {
      const seen: string[][] = [];
      service.selected$.subscribe(selected => seen.push(selected.map(e => e.uuid)));

      service.clear();

      expect(seen).toEqual([[]]);
    });

    it('stays quiet when the same element is selected again', () => {
      // A form reads the selection *and* publishes to it - it opens what is
      // selected, and selects what the user clicks in its list. Without this the
      // two would chase each other round for ever.
      service.select({ uuid: 'a', type: 'obst' });

      const seen: string[][] = [];
      service.selected$.subscribe(selected => seen.push(selected.map(e => e.uuid)));
      service.select({ uuid: 'a', type: 'obst' });

      expect(seen).toEqual([['a']]);
    });
  });

  it('drops the selection when another scenario is opened', () => {
    // A uuid names an element of one scenario; carried into the next it would
    // name nothing, or something else entirely
    mainService.setCurrentFdsScenario(
      new FdsScenario(JSON.stringify({ id: 1, projectId: 1, name: 'first' })));
    service.select({ uuid: 'a', type: 'obst' });

    mainService.setCurrentFdsScenario(
      new FdsScenario(JSON.stringify({ id: 2, projectId: 1, name: 'second' })));

    expect(service.selected).toEqual([]);
  });

  describe('selectedIn', () => {
    // What a form asks: it holds one list and wants the element of it to open

    it('finds the selected element of a list', () => {
      const obsts = [{ uuid: 'a', id: 'OBST1' }, { uuid: 'b', id: 'OBST2' }];
      service.select({ uuid: 'b', type: 'obst' });

      expect(service.selectedIn(obsts).id).toBe('OBST2');
    });

    it('has nothing to say about a list the selection is not in', () => {
      const holes = [{ uuid: 'c', id: 'HOLE1' }];
      service.select({ uuid: 'b', type: 'obst' });

      expect(service.selectedIn(holes)).toBeUndefined();
    });

    it('has nothing to say when nothing is selected', () => {
      expect(service.selectedIn([{ uuid: 'a', id: 'OBST1' }])).toBeUndefined();
    });
  });
});
