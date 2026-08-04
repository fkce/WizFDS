import { TestBed } from '@angular/core/testing';

import { FdsEditService } from './fds-edit.service';
import { AutoSaveService } from '@services/auto-save/auto-save.service';
import { FdsValidationService } from '@services/fds-validation/fds-validation.service';
import { HistoryService } from '@services/history/history.service';
import { FdsScenarioService } from '@services/fds-scenario/fds-scenario.service';
import { MainService } from '@services/main/main.service';
import { FdsScenario } from '@services/fds-scenario/fds-scenario';
import { Fds } from '@services/fds-object/fds-object';
import { SceneChange } from '../../../../../web-smokeview-lib/src/lib/services/drawing/scene-change';
import { appServiceProviders } from '../../../testing/app-service-testing';

/** A room with two walls, a doorway and a supply vent, on a 0.25 m grid. */
function scenarioJson(): object {
  return {
    id: 1, projectId: 7, name: 'edited',
    fdsObject: {
      geometry: {
        meshes: [{
          id: 'MESH1', uuid: 'mesh-uuid',
          xb: { x1: 0, x2: 10, y1: 0, y2: 10, z1: 0, z2: 3 },
          isize: 0.25, jsize: 0.25, ksize: 0.25
        }],
        surfs: [{ id: 'WALL', uuid: 'surf-uuid', color: { rgb: [200, 100, 50] }, transparency: 1 }],
        obsts: [
          {
            id: 'OBST1', uuid: 'w1', idAC: 12345,
            xb: { x1: 1, x2: 2, y1: 1, y2: 2, z1: 0, z2: 3 },
            surf: { type: 'surf_id', surf_id: 'WALL' }
          },
          {
            id: 'OBST2', uuid: 'w2', xb: { x1: 5, x2: 6, y1: 1, y2: 2, z1: 0, z2: 3 },
            surf: { type: 'surf_id', surf_id: 'WALL' }
          }
        ],
        holes: [{ id: 'DOOR', uuid: 'door', xb: { x1: 1, x2: 2, y1: 1, y2: 2, z1: 0, z2: 2 } }]
      },
      ventilation: {
        surfs: [{ id: 'SUPPLY', uuid: 'surfvent-uuid' }],
        vents: [{ id: 'V1', uuid: 'v1', surf_id: 'SUPPLY', xb: { x1: 1, x2: 2, y1: 1, y2: 1, z1: 0, z2: 2 } }]
      },
      fires: {
        fires: [{
          id: 'F1', uuid: 'f1',
          vent: { xb: { x1: 2, x2: 3, y1: 2, y2: 3, z1: 0, z2: 0 } }
        }]
      }
    }
  };
}

/**
 * Applying an edit command to `Fds` (#123).
 *
 * The spine of the loop: the library emits intent, this validates it, applies it
 * and records what it did, and the change goes back out to be redrawn
 * (ADR-0004). It applies the command whatever validation makes of it - warnings
 * never block (ADR-0009).
 */
describe('FdsEditService', () => {
  let service: FdsEditService;
  let history: HistoryService;
  let validation: FdsValidationService;
  let autoSave: AutoSaveService;
  let mainService: MainService;
  let fds: Fds;

  /** Where an element of the scenario currently stands. */
  function boxOf(uuid: string): any {
    const all = [
      ...fds.geometry.obsts, ...fds.geometry.holes, ...fds.ventilation.vents,
      ...fds.geometry.meshes
    ];
    const element: any = all.find((candidate: any) => candidate.uuid === uuid);
    return element ? element.xb : undefined;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...appServiceProviders(),
        { provide: FdsScenarioService, useValue: { updateFdsScenario: () => { } } }
      ]
    });

    service = TestBed.inject(FdsEditService);
    history = TestBed.inject(HistoryService);
    validation = TestBed.inject(FdsValidationService);
    autoSave = TestBed.inject(AutoSaveService);
    mainService = TestBed.inject(MainService);

    const scenario = new FdsScenario(JSON.stringify(scenarioJson()));
    fds = scenario.fdsObject;
    mainService.setCurrentFdsScenario(scenario);
  });

  describe('move', () => {
    it('moves the element by the delta', () => {
      service.apply({ kind: 'move', uuids: ['w1'], delta: { dx: 0.5, dy: 0, dz: 0 } });

      expect(boxOf('w1').x1).toBe(1.5);
      expect(boxOf('w1').x2).toBe(2.5);
    });

    it('leaves the other five coordinates where they were', () => {
      service.apply({ kind: 'move', uuids: ['w1'], delta: { dx: 0, dy: 0, dz: 0.25 } });

      expect(boxOf('w1')).toEqual(jasmine.objectContaining(
        { x1: 1, x2: 2, y1: 1, y2: 2, z1: 0.25, z2: 3.25 }));
    });

    it('moves everything the gesture named', () => {
      service.apply({ kind: 'move', uuids: ['w1', 'w2'], delta: { dx: 1, dy: 0, dz: 0 } });

      expect(boxOf('w1').x1).toBe(2);
      expect(boxOf('w2').x1).toBe(6);
    });

    it('records one gesture, however many elements it moved', () => {
      service.apply({ kind: 'move', uuids: ['w1', 'w2'], delta: { dx: 1, dy: 0, dz: 0 } });

      service.undo();

      expect(boxOf('w1').x1).toBe(1);
      expect(boxOf('w2').x1).toBe(5);
      expect(history.canUndo).toBe(false);
    });

    it('moves elements of any kind, not only obsts', () => {
      service.apply({ kind: 'move', uuids: ['door', 'v1'], delta: { dx: 0, dy: 0.5, dz: 0 } });

      expect(boxOf('door').y1).toBe(1.5);
      expect(boxOf('v1').y1).toBe(1.5);
    });

    it('moves a fire through the &VENT that carries its geometry', () => {
      // A fire has no box of its own, and `Fire.toJSON()` has no `xb` at all -
      // so a patch that put one there would be dropped on the way back in, and
      // the fire would sit still while the history claimed it had moved
      service.apply({ kind: 'move', uuids: ['f1'], delta: { dx: 1, dy: 0, dz: 0 } });

      expect((fds.fires.fires[0] as any).vent.xb.x1).toBe(3);
    });

    it('puts a moved fire back where it was', () => {
      service.apply({ kind: 'move', uuids: ['f1'], delta: { dx: 1, dy: 0, dz: 0 } });

      service.undo();

      expect((fds.fires.fires[0] as any).vent.xb.x1).toBe(2);
    });
  });

  describe('setXb', () => {
    it('puts the element exactly where it was told', () => {
      service.apply({
        kind: 'setXb', uuid: 'w1',
        xb: { x1: 3, x2: 3.25, y1: 0, y2: 4, z1: 0, z2: 2.5 }
      });

      expect(boxOf('w1')).toEqual(jasmine.objectContaining(
        { x1: 3, x2: 3.25, y1: 0, y2: 4, z1: 0, z2: 2.5 }));
    });

    it('applies a box that breaks the FDS rules all the same', () => {
      // Warnings never block: a scenario in the middle of being edited has every
      // right to be temporarily wrong (ADR-0009)
      service.apply({
        kind: 'setXb', uuid: 'w1',
        xb: { x1: 3.13, x2: 3.13, y1: 0, y2: 4, z1: 0, z2: 2.5 }
      });

      expect(boxOf('w1').x1).toBe(3.13);
      expect(validation.warningsFor('w1').map(w => w.rule).sort())
        .toEqual(['off-grid', 'zero-thickness']);
    });
  });

  describe('create', () => {
    it('adds an element of the kind that was asked for', () => {
      service.apply({
        kind: 'create', type: 'obst',
        xb: { x1: 7, x2: 8, y1: 7, y2: 8, z1: 0, z2: 3 }
      });

      expect(fds.geometry.obsts.length).toBe(3);
      expect(fds.geometry.obsts[2].xb.x1).toBe(7);
    });

    it('gives it an identity and a name of its own', () => {
      // The name continues the numbering the "add" button in the form uses, so
      // an element drawn in 3D and one added in a form are named alike
      service.apply({
        kind: 'create', type: 'obst',
        xb: { x1: 7, x2: 8, y1: 7, y2: 8, z1: 0, z2: 3 }
      });

      const created: any = fds.geometry.obsts[2];
      expect(created.uuid).toBeTruthy();
      expect(created.uuid).not.toBe('w1');
      expect(created.id).toBe('OBST3');
    });

    it('gives it the &SURF the command named', () => {
      service.apply({
        kind: 'create', type: 'obst', surfId: 'WALL',
        xb: { x1: 7, x2: 8, y1: 7, y2: 8, z1: 0, z2: 3 }
      });

      const created: any = fds.geometry.obsts[2];
      expect(created.surf.surf_id).toBe(fds.geometry.surfs[0] as any);
    });

    it('says which element it created, so it can be selected', () => {
      const change = service.apply({
        kind: 'create', type: 'obst',
        xb: { x1: 7, x2: 8, y1: 7, y2: 8, z1: 0, z2: 3 }
      });

      expect(change.added.length).toBe(1);
      expect(change.added[0].element.uuid).toBe((fds.geometry.obsts[2] as any).uuid);
    });

    it('gives it no idAC - it was never in a drawing (ADR-0005)', () => {
      // Zero is how the domain classes spell "not in the drawing": a CAD import
      // must carry a browser-drawn element across untouched (#120), and
      // ElementsService.byIdAC treats zero as absent.
      service.apply({
        kind: 'create', type: 'obst',
        xb: { x1: 7, x2: 8, y1: 7, y2: 8, z1: 0, z2: 3 }
      });

      const created: any = fds.geometry.obsts[2];
      expect(Number(created.idAC ?? 0)).toBe(0);
    });

    it('gives a created &VENT its &SURF from the ventilation list', () => {
      // Two lists of surfaces exist: geometry.surfs for an &OBST and
      // ventilation.surfs for a &VENT. The command names an id; which list it
      // resolves against is decided by what is being built.
      service.apply({
        kind: 'create', type: 'vent', surfId: 'SUPPLY',
        xb: { x1: 3, x2: 4, y1: 5, y2: 6, z1: 0, z2: 0 }
      });

      // "VENT1", because the existing vent is named V1 by hand and the highest
      // taken *number* in the list is none - the same continuation the form makes
      const created: any = fds.ventilation.vents[1];
      expect(created.id).toBe('VENT1');
      expect(created.surf).toBe(fds.ventilation.surfs[0] as any);
      expect(created.xb.z1).toBe(0);
      expect(created.xb.z2).toBe(0);
    });

    it('creates a &HOLE, which carries no &SURF at all', () => {
      service.apply({
        kind: 'create', type: 'hole',
        xb: { x1: 5.2, x2: 5.8, y1: 0.9, y2: 2.1, z1: 0, z2: 2 }
      });

      expect(fds.geometry.holes.length).toBe(2);
      expect((fds.geometry.holes[1] as any).id).toBe('HOLE1');
    });
  });

  describe('copy', () => {
    it('creates a copy at the shifted box and leaves the original put', () => {
      service.apply({ kind: 'copy', uuids: ['w1'], delta: { dx: 3, dy: 0, dz: 0 } });

      expect(fds.geometry.obsts.length).toBe(3);
      expect(boxOf('w1').x1).toBe(1);
      const copy: any = fds.geometry.obsts[2];
      expect(copy.xb.x1).toBe(4);
      expect(copy.xb.x2).toBe(5);
    });

    it('carries the source\'s properties but a fresh identity and no idAC', () => {
      service.apply({ kind: 'copy', uuids: ['w1'], delta: { dx: 3, dy: 0, dz: 0 } });

      const copy: any = fds.geometry.obsts[2];
      expect(copy.surf.surf_id).toBe(fds.geometry.surfs[0] as any);
      expect(copy.uuid).toBeTruthy();
      expect(copy.uuid).not.toBe('w1');
      expect(copy.id).toBe('OBST3');
      expect(Number(copy.idAC ?? 0)).toBe(0);
    });

    it('numbers many copies each with its own id', () => {
      // getListId() reads the live list and every patch is computed before
      // anything is written - naive per-patch numbering would hand every copy
      // the same OBST3 (#126)
      service.apply({ kind: 'copy', uuids: ['w1', 'w2'], delta: { dx: 0, dy: 3, dz: 0 } });

      expect(fds.geometry.obsts.map((o: any) => o.id))
        .toEqual(['OBST1', 'OBST2', 'OBST3', 'OBST4']);
    });

    it('copies a fire through the &VENT that carries its geometry', () => {
      service.apply({ kind: 'copy', uuids: ['f1'], delta: { dx: 1, dy: 0, dz: 0 } });

      expect(fds.fires.fires.length).toBe(2);
      expect((fds.fires.fires[1] as any).vent.xb.x1).toBe(3);
      expect((fds.fires.fires[0] as any).vent.xb.x1).toBe(2);
    });

    it('is one entry in the history, however many copies it made', () => {
      service.apply({ kind: 'copy', uuids: ['w1', 'w2'], delta: { dx: 0, dy: 3, dz: 0 } });

      service.undo();

      expect(fds.geometry.obsts.length).toBe(2);
      expect(history.canUndo).toBe(false);
    });

    it('announces the copies as added, so the preview builds them', () => {
      const change = service.apply({ kind: 'copy', uuids: ['w1'], delta: { dx: 3, dy: 0, dz: 0 } });

      expect(change.added.length).toBe(1);
      expect(change.changed.length).toBe(0);
    });
  });

  describe('array', () => {
    it('lays the copies out on the grid the counts and spacings describe', () => {
      service.apply({
        kind: 'array', uuids: ['w1'],
        counts: { x: 3, y: 2, z: 1 }, spacing: { x: 2, y: 4, z: 0 }
      });

      expect(fds.geometry.obsts.length).toBe(7);
      const copies = fds.geometry.obsts.slice(2)
        .map((o: any) => ({ x: o.xb.x1, y: o.xb.y1 }));
      expect(copies).toContain({ x: 1, y: 5 });
      expect(copies).toContain({ x: 3, y: 1 });
      expect(copies).toContain({ x: 3, y: 5 });
      expect(copies).toContain({ x: 5, y: 1 });
      expect(copies).toContain({ x: 5, y: 5 });
    });

    it('makes a row of twelve columns in one operation (the definition of done)', () => {
      service.apply({
        kind: 'array', uuids: ['w1'],
        counts: { x: 12, y: 1, z: 1 }, spacing: { x: 1.5, y: 0, z: 0 }
      });

      expect(fds.geometry.obsts.length).toBe(13);
      expect(new Set(fds.geometry.obsts.map((o: any) => o.id)).size).toBe(13);
    });

    it('is undone in a single step', () => {
      service.apply({
        kind: 'array', uuids: ['w1'],
        counts: { x: 12, y: 1, z: 1 }, spacing: { x: 1.5, y: 0, z: 0 }
      });

      service.undo();

      expect(fds.geometry.obsts.length).toBe(2);
      expect(history.canUndo).toBe(false);
    });

    it('asks for nothing when the counts describe only the original', () => {
      const change = service.apply({
        kind: 'array', uuids: ['w1'],
        counts: { x: 1, y: 1, z: 1 }, spacing: { x: 1, y: 1, z: 1 }
      });

      expect(change).toBeNull();
      expect(fds.geometry.obsts.length).toBe(2);
      expect(history.canUndo).toBe(false);
    });

    it('names the operation after the whole array', () => {
      service.apply({
        kind: 'array', uuids: ['w1'],
        counts: { x: 12, y: 1, z: 1 }, spacing: { x: 1.5, y: 0, z: 0 }
      });

      expect(history.undoLabel).toBe('Array of 12');
    });
  });

  describe('delete', () => {
    it('takes the element out of the scenario', () => {
      service.apply({ kind: 'delete', uuids: ['w1'] });

      expect(fds.geometry.obsts.map((o: any) => o.uuid)).toEqual(['w2']);
    });

    it('takes out everything the command named, whatever kind it is', () => {
      service.apply({ kind: 'delete', uuids: ['w1', 'door'] });

      expect(fds.geometry.obsts.length).toBe(1);
      expect(fds.geometry.holes.length).toBe(0);
    });

    it('says what it removed, so the preview can drop it', () => {
      const change = service.apply({ kind: 'delete', uuids: ['w1'] });

      expect(change.removed).toEqual([{ type: 'obst', uuid: 'w1' }]);
    });

    it('says nothing to the preview about an element it never drew', () => {
      // A &SURF has no shape, and the CAD plugin can select one - naming it in
      // the change would send the preview looking for a list it has not got
      const change = service.apply({ kind: 'delete', uuids: ['surf-uuid'] });

      expect(fds.geometry.surfs.length).toBe(0);
      expect(change.removed).toEqual([]);
    });
  });

  describe('a command that names nothing', () => {
    it('changes nothing and records nothing', () => {
      const change = service.apply({ kind: 'move', uuids: ['nobody'], delta: { dx: 1, dy: 0, dz: 0 } });

      expect(change).toBeNull();
      expect(history.canUndo).toBe(false);
    });

    it('applies the part of a gesture that does name something', () => {
      service.apply({ kind: 'move', uuids: ['w1', 'nobody'], delta: { dx: 1, dy: 0, dz: 0 } });

      expect(boxOf('w1').x1).toBe(2);
    });
  });

  describe('undo and redo', () => {
    it('puts a moved element back where it was', () => {
      service.apply({ kind: 'move', uuids: ['w1'], delta: { dx: 0.5, dy: 0, dz: 0 } });

      service.undo();

      expect(boxOf('w1').x1).toBe(1);
    });

    it('moves it again on redo', () => {
      service.apply({ kind: 'move', uuids: ['w1'], delta: { dx: 0.5, dy: 0, dz: 0 } });
      service.undo();

      service.redo();

      expect(boxOf('w1').x1).toBe(1.5);
    });

    it('keeps the element the forms are holding, rather than replacing it', () => {
      // A form binds to the object it found in the list; swapping in a new one
      // would leave it editing something no longer in the scenario
      const held = fds.geometry.obsts[0];
      service.apply({ kind: 'move', uuids: ['w1'], delta: { dx: 0.5, dy: 0, dz: 0 } });

      service.undo();

      expect(fds.geometry.obsts[0]).toBe(held);
      expect(held.xb.x1).toBe(1);
    });

    it('takes a created element back out', () => {
      service.apply({
        kind: 'create', type: 'obst', xb: { x1: 7, x2: 8, y1: 7, y2: 8, z1: 0, z2: 3 }
      });

      service.undo();

      expect(fds.geometry.obsts.length).toBe(2);
    });

    it('puts a deleted element back where it stood in the list', () => {
      // FDS reads a namelist file in order and a later &OBST wins where two
      // overlap, so restoring it at the end would not be the same scenario
      service.apply({ kind: 'delete', uuids: ['w1'] });

      service.undo();

      expect(fds.geometry.obsts.map((o: any) => o.uuid)).toEqual(['w1', 'w2']);
    });

    it('restores a deleted element with everything it had', () => {
      service.apply({ kind: 'delete', uuids: ['w1'] });

      service.undo();

      const restored: any = fds.geometry.obsts[0];
      expect(restored.id).toBe('OBST1');
      expect(restored.xb.x1).toBe(1);
      expect(restored.surf.surf_id).toBe(fds.geometry.surfs[0] as any);
    });

    it('answers whether there was anything to undo', () => {
      expect(service.undo()).toBe(false);

      service.apply({ kind: 'move', uuids: ['w1'], delta: { dx: 1, dy: 0, dz: 0 } });

      expect(service.undo()).toBe(true);
    });
  });

  describe('what an applied command sets off', () => {
    it('marks the scenario as changed, without comparing it', () => {
      const marked = spyOn(autoSave, 'markDirty');

      service.apply({ kind: 'move', uuids: ['w1'], delta: { dx: 1, dy: 0, dz: 0 } });

      expect(marked).toHaveBeenCalled();
    });

    it('marks it on undo too - undoing is a change like any other', () => {
      service.apply({ kind: 'move', uuids: ['w1'], delta: { dx: 1, dy: 0, dz: 0 } });
      const marked = spyOn(autoSave, 'markDirty');

      service.undo();

      expect(marked).toHaveBeenCalled();
    });

    it('checks the rules again, so the palette shows what changed', () => {
      service.apply({
        kind: 'setXb', uuid: 'w1', xb: { x1: 1.13, x2: 2, y1: 1, y2: 2, z1: 0, z2: 3 }
      });

      expect(validation.warningsFor('w1').map(w => w.rule)).toEqual(['off-grid']);
    });

    it('publishes the change, in the form the preview draws', () => {
      const seen: SceneChange[] = [];
      service.applied$.subscribe(change => seen.push(change));

      service.apply({ kind: 'move', uuids: ['w1'], delta: { dx: 0.5, dy: 0, dz: 0 } });

      expect(seen.length).toBe(1);
      expect(seen[0].changed[0].type).toBe('obst');
      expect(seen[0].changed[0].element.xb).toEqual(
        { x1: 1.5, x2: 2.5, y1: 1, y2: 2, z1: 0, z2: 3 });
    });

    it('publishes what an undo did as well', () => {
      service.apply({ kind: 'delete', uuids: ['w1'] });
      const seen: SceneChange[] = [];
      service.applied$.subscribe(change => seen.push(change));

      service.undo();

      expect(seen[0].added.map(drawn => drawn.element.uuid)).toEqual(['w1']);
    });
  });

  it('does nothing at all with no scenario open', () => {
    mainService.setCurrentFdsScenario(undefined);

    expect(service.apply({ kind: 'move', uuids: ['w1'], delta: { dx: 1, dy: 0, dz: 0 } }))
      .toBeNull();
  });
});
