import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { ElementsService, FdsElementType, FoundElement } from '@services/elements/elements.service';
import { boxOf, isDrawnType, withBox } from '@services/elements/element-geometry';
import { MainService } from '@services/main/main.service';
import { Main } from '@services/main/main';
import { Fds } from '@services/fds-object/fds-object';
import { IdGeneratorService } from '@services/id-generator/id-generator.service';
import { AutoSaveService } from '@services/auto-save/auto-save.service';
import { FdsValidationService } from '@services/fds-validation/fds-validation.service';
import { HistoryService } from '@services/history/history.service';
import { ElementPatch } from '@services/history/element-patch';
import { SceneInputService } from '@services/scene-input/scene-input.service';
import {
  SceneChange, SceneDrawnElement, SceneRemovedElement
} from '../../../../../web-smokeview-lib/src/lib/services/drawing/scene-change';
import {
  SceneCreateCommand, SceneDeleteCommand, SceneEditCommand, SceneMoveCommand, SceneSetXbCommand
} from '../../../../../web-smokeview-lib/src/lib/services/editing/edit-command';
import { SceneElementType, SceneXb } from '../../../../../web-smokeview-lib/src/lib/services/drawing/scene-input';

/** Which of the state a patch holds is being written back. */
type PatchSide = 'before' | 'after';

/**
 * Applies an edit command to the scenario - the one place that writes to `Fds`
 * through the command channel.
 *
 * The middle of the loop ADR-0004 describes: the library hands over an intent,
 * this turns it into a change to the model, and the change goes back out on
 * `applied$` for the preview to redraw incrementally. Four things happen for
 * every applied command, in this order and always together:
 *
 * 1. the command is applied, whatever the rules make of the result;
 * 2. a patch per element goes onto the undo stack, as one entry;
 * 3. the scenario is marked changed - no comparison, the change is known;
 * 4. the rules are checked again, and the change is published.
 *
 * Validation warns and never blocks (ADR-0009). FDS itself snaps a misaligned
 * &OBST to the nearest cell boundaries and computes on, so refusing the edit
 * would make the editor stricter than the solver - and silently correcting it
 * would hand the user a number they did not type.
 *
 * Form edits do not come through here: `[(ngModel)]` writes straight to the
 * model, and there is no moment at which such a change could be caught. That is
 * why they are not in the history, and why auto-save still compares for them.
 */
@Injectable({
  providedIn: 'root'
})
export class FdsEditService {

  private readonly appliedSubject = new Subject<SceneChange>();

  /**
   * What changed, each time something did.
   *
   * The preview subscribes and redraws exactly this much (`update()`), rather
   * than being handed the whole scenario again. Every producer of edits - the
   * palette, the library's command stream, undo and redo - arrives here, so
   * there is one place the view has to listen to.
   */
  public readonly applied$: Observable<SceneChange> = this.appliedSubject.asObservable();

  private main: Main;

  constructor(
    private mainService: MainService,
    private elements: ElementsService,
    private history: HistoryService,
    private validation: FdsValidationService,
    private autoSave: AutoSaveService,
    private sceneInput: SceneInputService,
    private idGenerator: IdGeneratorService
  ) {
    mainService.getMain().subscribe(main => this.main = main);
  }

  /**
   * Apply one command to the scenario.
   *
   * @returns what changed, for the preview to redraw - or null when the command
   *          named nothing that is in the scenario, which is not an error: a
   *          click can outlive the element it landed on.
   */
  public apply(command: SceneEditCommand): SceneChange | null {
    const fds = this.fds();
    if (!fds) { return null; }

    const patches = this.patchesFor(command, fds);
    if (patches.length === 0) { return null; }

    patches.forEach(patch => this.write(patch, 'after', fds));

    this.history.push({ label: labelFor(command, patches), patches: patches });
    return this.settle(patches, 'after', fds);
  }

  /**
   * Take the last gesture back.
   *
   * @returns whether there was one
   */
  public undo(): boolean {
    return this.replay(this.history.undo()?.patches, 'before');
  }

  /** Do the last undone gesture again. */
  public redo(): boolean {
    return this.replay(this.history.redo()?.patches, 'after');
  }

  /** Write one side of a set of patches back into the scenario. */
  private replay(patches: readonly ElementPatch[] | undefined, side: PatchSide): boolean {
    const fds = this.fds();
    if (!patches || !fds) { return false; }

    patches.forEach(patch => this.write(patch, side, fds));
    this.settle(patches, side, fds);
    return true;
  }

  /**
   * Everything that follows from a change having been made.
   *
   * One place for it, so that an undo sets off exactly what applying the command
   * did - it is a change to the scenario like any other, and the scenario is as
   * unsaved after it as before.
   */
  private settle(patches: readonly ElementPatch[], side: PatchSide, fds: Fds): SceneChange {
    this.autoSave.markDirty();
    this.validation.revalidate();

    const change = this.changeFrom(patches, side, fds);
    this.appliedSubject.next(change);
    return change;
  }

  // ==========================================
  // Turning a command into patches
  // ==========================================

  /**
   * What the command would do, element by element, as before-and-after states.
   *
   * Worked out before anything is written, so that one patch is one element's
   * whole story and the undo stack never holds a half-applied gesture.
   */
  private patchesFor(command: SceneEditCommand, fds: Fds): ElementPatch[] {
    switch (command.kind) {
      case 'move': return this.movePatches(command);
      case 'setXb': return this.setXbPatches(command);
      case 'create': return this.createPatches(command);
      case 'delete': return this.deletePatches(command);
    }
  }

  private movePatches(command: SceneMoveCommand): ElementPatch[] {
    const delta = command.delta;

    return this.eachNamed(command.uuids, (found) => {
      const xb = boxOf(found.type, found.element);
      if (!xb) { return undefined; }

      return this.editPatch(found, {
        x1: xb.x1 + delta.dx, x2: xb.x2 + delta.dx,
        y1: xb.y1 + delta.dy, y2: xb.y2 + delta.dy,
        z1: xb.z1 + delta.dz, z2: xb.z2 + delta.dz
      });
    });
  }

  private setXbPatches(command: SceneSetXbCommand): ElementPatch[] {
    return this.eachNamed([command.uuid], (found) =>
      boxOf(found.type, found.element) ? this.editPatch(found, command.xb) : undefined);
  }

  /**
   * A patch that leaves the element as it is but for its box.
   *
   * Built from the element's own `toJSON()`, which is what the whole mechanism
   * rests on: whatever else the element carries - its &SURF, its device, its
   * `idAC` - survives the round trip untouched, without this having to know
   * about any of it. Where the new box goes is `withBox()`'s business, because
   * not every kind keeps it in the same place.
   */
  private editPatch(found: FoundElement, xb: SceneXb): ElementPatch {
    const before = found.element.toJSON();

    return {
      uuid: found.element.uuid,
      collection: found.type,
      index: this.indexOf(found),
      before: before,
      after: withBox(found.type, before, xb)
    };
  }

  private createPatches(command: SceneCreateCommand): ElementPatch[] {
    const type = command.type as FdsElementType;
    const list = this.elements.listOf(type);

    // The library has no business inventing either: a uuid is the app's identity
    // to hand out (ADR-0005), and an FDS `ID` has to be unique among elements
    // the library was never told about.
    const created: any = {
      id: `${type.toUpperCase()}${this.mainService.getListId(list, type)}`,
      uuid: this.idGenerator.genUUID(),
      xb: { ...command.xb }
    };

    if (command.surfId) { applySurf(created, type, command.surfId); }

    return [{
      uuid: created.uuid, collection: type, index: list.length,
      before: null, after: created
    }];
  }

  private deletePatches(command: SceneDeleteCommand): ElementPatch[] {
    return this.eachNamed(command.uuids, (found) => ({
      uuid: found.element.uuid,
      collection: found.type,
      index: this.indexOf(found),
      before: found.element.toJSON(),
      after: null
    }));
  }

  /**
   * One patch per uuid the scenario actually holds.
   *
   * A uuid it does not is skipped rather than refused: a selection outlives the
   * render it was made in, and an element can leave the scenario between a click
   * and the gesture that follows it. The rest of the gesture still applies.
   */
  private eachNamed(
    uuids: readonly string[], patchFor: (found: FoundElement) => ElementPatch | undefined
  ): ElementPatch[] {
    const patches: ElementPatch[] = [];

    uuids.forEach(uuid => {
      const found = this.elements.byUuid(uuid);
      if (!found) { return; }

      const patch = patchFor(found);
      if (patch) { patches.push(patch); }
    });

    return patches;
  }

  /** Where this element stands in its own list. */
  private indexOf(found: FoundElement): number {
    return this.elements.listOf(found.type)
      .findIndex((candidate: any) => candidate && candidate.uuid === found.element.uuid);
  }

  // ==========================================
  // Writing a patch back
  // ==========================================

  /**
   * Put one element into the state this side of the patch describes.
   *
   * Three cases, and they are what makes one mechanism enough for every command
   * (ADR-0009): a state where there was none is an insertion, no state where
   * there was one is a removal, and a state on both sides is an edit.
   */
  private write(patch: ElementPatch, side: PatchSide, fds: Fds): void {
    const state = side === 'before' ? patch.before : patch.after;
    const list = this.elements.listOf(patch.collection);
    const index = list.findIndex((candidate: any) => candidate && candidate.uuid === patch.uuid);

    if (!state) {
      if (index >= 0) { list.splice(index, 1); }
      return;
    }

    const built = this.elements.build(patch.collection, state);
    if (!built) { return; }

    if (index < 0) {
      // Back where it stood: FDS reads a namelist file in order, and a later
      // &OBST wins where two overlap
      list.splice(Math.min(patch.index, list.length), 0, built);
      return;
    }

    // Onto the element the app already holds rather than in place of it: the
    // forms bind to the object they found in this list, and the selection and
    // the CAD bridge hold it too. Replacing it would leave every one of them
    // editing something that is no longer in the scenario. The classes keep
    // their state in plain `_`-prefixed fields, so this copies the whole of it.
    Object.assign(list[index], built);
  }

  // ==========================================
  // Saying what changed
  // ==========================================

  /** What the preview has to redraw, in the form it draws from. */
  private changeFrom(patches: readonly ElementPatch[], side: PatchSide, fds: Fds): SceneChange {
    const changed: SceneDrawnElement[] = [];
    const added: SceneDrawnElement[] = [];
    const removed: SceneRemovedElement[] = [];

    patches.forEach(patch => {
      const state = side === 'before' ? patch.before : patch.after;
      const other = side === 'before' ? patch.after : patch.before;

      // The preview has no list for a &SURF or a &SLCF, so it has nothing to
      // take off the screen either - and naming one would send it looking
      if (!isDrawnType(patch.collection)) { return; }

      if (!state) {
        removed.push({ type: patch.collection as SceneElementType, uuid: patch.uuid });
        return;
      }

      const found = this.elements.byUuid(patch.uuid);
      const drawn = found ? this.sceneInput.drawn(patch.collection, found.element, fds) : undefined;
      // A &GEOM with no triangles is drawn nowhere, however real it is
      if (!drawn) { return; }

      // An element that was not there a moment ago has to be built, not updated
      (other ? changed : added).push(drawn);
    });

    return { changed: changed, added: added, removed: removed };
  }

  /** The scenario currently open, if one is. */
  private fds(): Fds | undefined {
    return this.main?.currentFdsScenario?.fdsObject;
  }
}

/**
 * Name a &SURF on a newly created element, in the shape its class reads.
 *
 * An &OBST carries a `surf` object saying which of the three FDS forms it uses;
 * a &VENT and a &GEOM name one directly. The two shapes are the same ones
 * SceneInputService reads back through. A &HOLE is not here: it is an opening
 * and its class has no surface field at all - the draw tool never names one
 * for it (#125).
 */
function applySurf(created: any, type: FdsElementType, surfId: string): void {
  if (type === 'obst') {
    created.surf = { type: 'surf_id', surf_id: surfId };
    return;
  }
  created.surf_id = surfId;
}

/** What the undo button will say it takes back. */
function labelFor(command: SceneEditCommand, patches: readonly ElementPatch[]): string {
  switch (command.kind) {
    case 'move':
      return patches.length > 1 ? `Move ${patches.length} elements` : 'Move';
    case 'setXb':
      return 'Set XB';
    case 'create':
      return `Create ${command.type.toUpperCase()}`;
    case 'delete':
      return patches.length > 1
        ? `Delete ${patches.length} elements`
        : `Delete ${patches[0].collection.toUpperCase()}`;
  }
}
