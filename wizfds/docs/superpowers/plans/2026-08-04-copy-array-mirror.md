# Copy, Rectangular Array and Mirror (#126) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Copy-drag on the gizmo, an ARRAYRECT-style rectangular array and an axis-plane mirror, each committing as ONE edit command / ONE history entry, with fresh identities and no `idAC` on every clone.

**Architecture:** Three new kinds in the closed `SceneEditCommand` union (`copy`, `array`, `mirror`). `FdsEditService` turns each into element patches via a shared `clonePatches()` that builds copies from the source's `toJSON()` + `withBox()` and numbers ids itself (the `getListId()` trap: all patches are computed before anything is written). The gizmo emits `copy` when ctrl was held at the grab of an axis arrow (ADR-0011 amendment) or when the ribbon armed it; array and mirror are built in ribbon contextual tabs with live ghost previews (new `PickService.previewGhosts()`), and applied via `fdsEdit.apply()` directly.

**Tech Stack:** Angular 20 multi-project workspace, Karma+Jasmine, BabylonJS (NullEngine in tests). App: `projects/wizfds`, library: `projects/web-smokeview-lib`.

**Decision log (deviations from the issue text):**
- Issue #126 says "hold ctrl while dragging". ADR-0011 (accepted 2026-08-04) already gives ctrl-at-grab meanings: plan square → vertical gesture, other handles → start unsnapped. Resolution: ctrl-at-grab on **axis arrows** becomes **copy** (the old "start unsnapped" there is reachable via a fresh ctrl press after the grab); the plan square keeps the vertical gesture; the ribbon **Copy** button arms a copy for the next gesture on any handle. Documented as an ADR-0011 amendment (Task 10).
- "The plane is placed by snapping" for mirror: deferred. The library has no "pick a point" tool; v1 offers a typed coordinate plus Min/Centre/Max presets from the selection bounds. Noted in the ADR-0010 amendment and the PR.

---

### Task 0: Worktree setup

**Files:** none (environment)

- [ ] **Step 1: Install dependencies in the worktree**

Run (in `…\.claude\worktrees\feat-copy-array-mirror\wizfds`):
```bash
npm ci
npm run wizFds:cm:copy
```
Expected: clean install; CodeMirror addons copied.

- [ ] **Step 2: Verify the suites run before any change**

Run: `npx ng test wizfds --watch=false --browsers=ChromeHeadless`
Run: `npx ng test webSmokeviewLib --watch=false --browsers=ChromeHeadless`
Expected: both green.

---

### Task 1: The `copy` command in the union and in FdsEditService

**Files:**
- Modify: `projects/web-smokeview-lib/src/lib/services/editing/edit-command.ts`
- Modify: `projects/wizfds/src/app/services/elements/element-geometry.ts`
- Modify: `projects/wizfds/src/app/services/fds-edit/fds-edit.service.ts`
- Test: `projects/wizfds/src/app/services/fds-edit/fds-edit.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

In `fds-edit.service.spec.ts`: add `idAC: 12345` to the OBST1 fixture entry (`scenarioJson()`), then add after the `create` describe:

```ts
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
```

Note: verify the `Obst` class accepts `idAC` from JSON (`services/fds-object/geometry/obst.ts` or similar — grep for `idAC` in it). If the fixture field is ignored by the constructor, set it via `(fds.geometry.obsts[0] as any).idAC = 12345;` inside the identity test instead.

- [ ] **Step 2: Run to verify failure** — `npx ng test wizfds --watch=false --browsers=ChromeHeadless`. Expected: compile error (`kind: 'copy'` not assignable) — that is the union doing its job.

- [ ] **Step 3: Implement**

`edit-command.ts` — after `SceneCreateCommand`:

```ts
/**
 * Create a copy of each element: the source's whole state at a shifted box.
 *
 * A delta over uuids, exactly as a move - the gizmo's copy-drag IS a move whose
 * original stays put (#126). Identity is the app's to hand out, copy by copy,
 * and a copy must not inherit the source's CAD link, or the next import would
 * treat two objects as one.
 */
export interface SceneCopyCommand {
    readonly kind: 'copy',
    readonly uuids: readonly string[],
    readonly delta: SceneDelta
}
```

Extend the union:
```ts
export type SceneEditCommand =
    SceneMoveCommand | SceneSetXbCommand | SceneCreateCommand | SceneDeleteCommand |
    SceneCopyCommand;
```

`element-geometry.ts` — add at the end:

```ts
/** The same box, shifted. */
export function shiftedBox(xb: ElementBox, dx: number, dy: number, dz: number): ElementBox {
    return {
        x1: xb.x1 + dx, x2: xb.x2 + dx,
        y1: xb.y1 + dy, y2: xb.y2 + dy,
        z1: xb.z1 + dz, z2: xb.z2 + dz
    };
}
```

`fds-edit.service.ts`:
- import `SceneCopyCommand` in the edit-command import, `shiftedBox` and `ElementBox` in the element-geometry import;
- `patchesFor()` gains `case 'copy': return this.copyPatches(command);`
- after `createPatches()` add:

```ts
  private copyPatches(command: SceneCopyCommand): ElementPatch[] {
    const delta = command.delta;
    return this.clonePatches(this.sourcesOf(command.uuids).map(source => ({
      found: source.found,
      xb: shiftedBox(source.xb, delta.dx, delta.dy, delta.dz)
    })));
  }

  /** The elements a clone-producing command starts from, skipping what is gone. */
  private sourcesOf(uuids: readonly string[]): Array<{ found: FoundElement, xb: ElementBox }> {
    const sources: Array<{ found: FoundElement, xb: ElementBox }> = [];
    uuids.forEach(uuid => {
      const found = this.elements.byUuid(uuid);
      if (!found) { return; }
      const xb = boxOf(found.type, found.element);
      if (!xb) { return; }
      sources.push({ found: found, xb: xb });
    });
    return sources;
  }

  /**
   * One patch per copy: the source's whole state at a new box, under a fresh
   * identity and with no CAD link (#126).
   *
   * Built from `toJSON()` for the same reason editPatch() is: the &SURF, the
   * colour, the device - whatever else the source carries survives untouched.
   * Ids are numbered here rather than per patch, because every patch is
   * computed before anything is written: N calls to getListId() would hand N
   * copies the same number.
   */
  private clonePatches(
    clones: ReadonlyArray<{ found: FoundElement, xb: ElementBox }>
  ): ElementPatch[] {
    const nextId = new Map<FdsElementType, number>();
    const nextIndex = new Map<FdsElementType, number>();

    return clones.map(clone => {
      const type = clone.found.type;
      const list = this.elements.listOf(type);

      if (!nextId.has(type)) {
        nextId.set(type, this.mainService.getListId(list, type));
        nextIndex.set(type, list.length);
      }
      const number = nextId.get(type);
      nextId.set(type, number + 1);
      const index = nextIndex.get(type);
      nextIndex.set(type, index + 1);

      const created: any = withBox(type, clone.found.element.toJSON(), clone.xb);
      created.uuid = this.idGenerator.genUUID();
      created.id = `${type.toUpperCase()}${number}`;
      // A copy is a browser object: inheriting the source's link to the
      // drawing would make a CAD import treat two objects as one (#120)
      delete created.idAC;
      // A fire's geometry is its nested &VENT, which has an identity of its own
      if (created.vent) {
        delete created.vent.idAC;
        if (created.vent.uuid) { created.vent.uuid = this.idGenerator.genUUID(); }
      }

      return {
        uuid: created.uuid, collection: type, index: index,
        before: null, after: created
      };
    });
  }
```

- `labelFor()` gains:
```ts
    case 'copy':
      return patches.length > 1 ? `Copy ${patches.length} elements` : 'Copy';
```

- [ ] **Step 4: Run to verify pass** — same command. Expected: all green.

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat(edit): copy command - clones with fresh identity and no idAC (#126)"
```

---

### Task 2: The `array` command

**Files:**
- Modify: `projects/web-smokeview-lib/src/lib/services/editing/edit-command.ts`
- Modify: `projects/wizfds/src/app/services/elements/element-geometry.ts`
- Modify: `projects/wizfds/src/app/services/fds-edit/fds-edit.service.ts`
- Test: `projects/wizfds/src/app/services/fds-edit/fds-edit.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

```ts
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
```

- [ ] **Step 2: Run to verify failure** (compile error on `kind: 'array'`).

- [ ] **Step 3: Implement**

`edit-command.ts`:

```ts
/**
 * Lay copies of the selection out on a rectangular grid - AutoCAD's ARRAYRECT
 * cut down to what an axis-aligned box needs (#126).
 *
 * Counts say how many stand along each axis, the original included; spacing is
 * the step between neighbours, in FDS metres. The slot the original occupies
 * is not created again, so counts of {2,1,1} make exactly one copy.
 */
export interface SceneArrayCommand {
    readonly kind: 'array',
    readonly uuids: readonly string[],
    readonly counts: { readonly x: number, readonly y: number, readonly z: number },
    readonly spacing: { readonly x: number, readonly y: number, readonly z: number }
}
```
Extend the union with `SceneArrayCommand`.

`element-geometry.ts`:

```ts
/** A count that means anything: a whole number, at least one. */
export function arrayCount(count: number): number {
    return Math.max(1, Math.floor(count || 1));
}

/**
 * Every slot of a rectangular array except the original's, as index triples.
 *
 * Shared by the command that creates the copies and the ribbon preview that
 * shows them, so the ghosts stand exactly where the array will (#126).
 */
export function arraySlots(
    counts: { x: number, y: number, z: number }
): Array<{ ix: number, iy: number, iz: number }> {
    const slots: Array<{ ix: number, iy: number, iz: number }> = [];
    for (let ix = 0; ix < arrayCount(counts.x); ix++) {
        for (let iy = 0; iy < arrayCount(counts.y); iy++) {
            for (let iz = 0; iz < arrayCount(counts.z); iz++) {
                if (ix === 0 && iy === 0 && iz === 0) { continue; }
                slots.push({ ix: ix, iy: iy, iz: iz });
            }
        }
    }
    return slots;
}
```

`fds-edit.service.ts` — import `arrayCount`, `arraySlots`; `patchesFor()` gains `case 'array': return this.arrayPatches(command);`; add:

```ts
  private arrayPatches(command: SceneArrayCommand): ElementPatch[] {
    const slots = arraySlots(command.counts);

    const clones: Array<{ found: FoundElement, xb: ElementBox }> = [];
    this.sourcesOf(command.uuids).forEach(source => {
      slots.forEach(slot => clones.push({
        found: source.found,
        xb: shiftedBox(source.xb,
          slot.ix * command.spacing.x,
          slot.iy * command.spacing.y,
          slot.iz * command.spacing.z)
      }));
    });

    return this.clonePatches(clones);
  }
```

`labelFor()` gains:

```ts
    case 'array': {
      // The whole array, originals included - "Array of 12" is the row the
      // user asked for, not the eleven boxes it took to complete it
      const per = arrayCount(command.counts.x)
        * arrayCount(command.counts.y) * arrayCount(command.counts.z);
      return `Array of ${(patches.length / (per - 1)) * per}`;
    }
```

- [ ] **Step 4: Run to verify pass.**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(edit): rectangular array command (#126)"`

---

### Task 3: The `mirror` command

**Files:** same four as Task 2.

- [ ] **Step 1: Write the failing tests**

```ts
describe('mirror', () => {
    // w1 spans x 1..2; about the plane x=3 its reflection spans 4..5
    it('reflects about a plane perpendicular to x, min and max kept in order', () => {
      service.apply({ kind: 'mirror', uuids: ['w1'], axis: 'x', coordinate: 3, keepOriginal: true });

      const copy: any = fds.geometry.obsts[2];
      expect(copy.xb).toEqual(jasmine.objectContaining({ x1: 4, x2: 5, y1: 1, y2: 2 }));
      expect(boxOf('w1').x1).toBe(1);
    });

    it('reflects about planes perpendicular to y and to z', () => {
      service.apply({ kind: 'mirror', uuids: ['w1'], axis: 'y', coordinate: 0, keepOriginal: true });
      service.apply({ kind: 'mirror', uuids: ['w1'], axis: 'z', coordinate: 3, keepOriginal: true });

      expect((fds.geometry.obsts[2] as any).xb).toEqual(jasmine.objectContaining({ y1: -2, y2: -1 }));
      expect((fds.geometry.obsts[3] as any).xb).toEqual(jasmine.objectContaining({ z1: 3, z2: 6 }));
    });

    it('gives a kept mirror a fresh identity, like any other copy', () => {
      service.apply({ kind: 'mirror', uuids: ['w1'], axis: 'x', coordinate: 3, keepOriginal: true });

      const copy: any = fds.geometry.obsts[2];
      expect(copy.id).toBe('OBST3');
      expect(copy.uuid).not.toBe('w1');
    });

    it('moves the elements themselves when the original is dropped', () => {
      service.apply({ kind: 'mirror', uuids: ['w1'], axis: 'x', coordinate: 3, keepOriginal: false });

      expect(fds.geometry.obsts.length).toBe(2);
      expect(boxOf('w1')).toEqual(jasmine.objectContaining({ x1: 4, x2: 5 }));
    });

    it('is one step to undo either way', () => {
      service.apply({ kind: 'mirror', uuids: ['w1', 'w2'], axis: 'x', coordinate: 3, keepOriginal: false });

      service.undo();

      expect(boxOf('w1').x1).toBe(1);
      expect(boxOf('w2').x1).toBe(5);
      expect(history.canUndo).toBe(false);
    });
});
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement**

`edit-command.ts`:

```ts
/**
 * Mirror the selection about a plane perpendicular to one axis (#126).
 *
 * The plane is `axis = coordinate`. With `keepOriginal` the mirrored boxes are
 * copies under fresh identities; without it the elements themselves move.
 */
export interface SceneMirrorCommand {
    readonly kind: 'mirror',
    readonly uuids: readonly string[],
    readonly axis: 'x' | 'y' | 'z',
    readonly coordinate: number,
    readonly keepOriginal: boolean
}
```
Extend the union with `SceneMirrorCommand`.

`element-geometry.ts`:

```ts
/**
 * The box reflected about the plane `axis = coordinate`, its min and max kept
 * in order: the reflection of the near face is the far face of the mirror.
 */
export function mirroredBox(
    xb: ElementBox, axis: 'x' | 'y' | 'z', coordinate: number
): ElementBox {
    const lo = 2 * coordinate - xb[`${axis}2`];
    const hi = 2 * coordinate - xb[`${axis}1`];
    return {
        x1: axis === 'x' ? lo : xb.x1, x2: axis === 'x' ? hi : xb.x2,
        y1: axis === 'y' ? lo : xb.y1, y2: axis === 'y' ? hi : xb.y2,
        z1: axis === 'z' ? lo : xb.z1, z2: axis === 'z' ? hi : xb.z2
    };
}
```

`fds-edit.service.ts` — import `mirroredBox`; `patchesFor()` gains `case 'mirror': return this.mirrorPatches(command);`; add:

```ts
  private mirrorPatches(command: SceneMirrorCommand): ElementPatch[] {
    const sources = this.sourcesOf(command.uuids);

    if (command.keepOriginal) {
      return this.clonePatches(sources.map(source => ({
        found: source.found,
        xb: mirroredBox(source.xb, command.axis, command.coordinate)
      })));
    }

    // Dropping the original is the elements themselves moving - an edit, not
    // a creation, and still one history entry however many were selected
    return sources.map(source =>
      this.editPatch(source.found, mirroredBox(source.xb, command.axis, command.coordinate)));
  }
```

`labelFor()` gains:
```ts
    case 'mirror':
      return patches.length > 1 ? `Mirror ${patches.length} elements` : 'Mirror';
```

- [ ] **Step 4: Run to verify pass.**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(edit): mirror command about an axis-aligned plane (#126)"`

---

### Task 4: Copy-drag on the gizmo (library)

**Files:**
- Modify: `projects/web-smokeview-lib/src/lib/services/editing/gizmo.service.ts`
- Test: `projects/web-smokeview-lib/src/lib/services/editing/gizmo.service.spec.ts`

- [ ] **Step 1: Write the failing tests** (new describe next to `'a translate'`; same `draw`/`select` helpers):

```ts
  describe('a copy-drag (#126)', () => {

    beforeEach(() => {
      draw('west', WEST);
      select('west');
    });

    it('emits one copy when ctrl was held at the grab of an axis arrow', () => {
      const adapter: any = gizmo;
      gizmo.setCtrlHeld(true);

      adapter.onMoveDragStart('x');
      adapter.onMoveDrag('x', new BABYLON.Vector3(2, 0, 0));
      adapter.onMoveDragEnd();

      expect(commands).toEqual([
        { kind: 'copy', uuids: ['west'], delta: { dx: 2, dy: 0, dz: 0 } }
      ]);
    });

    it('does not suspend snapping - the ctrl was spent on the copy', () => {
      gizmo.setCtrlHeld(true);

      (gizmo as any).onMoveDragStart('x');

      expect(snapping.suspended).toBe(false);
    });

    it('leaves the plan square to the vertical gesture (ADR-0011)', () => {
      const adapter: any = gizmo;
      gizmo.setCtrlHeld(true);

      adapter.onMoveDragStart('plan');
      adapter.onMoveDrag('plan', new BABYLON.Vector3(0, 0, 1));
      adapter.onMoveDragEnd();

      expect(commands.length).toBe(1);
      expect(commands[0].kind).toBe('move');
    });

    it('arms a copy from the ribbon for the next gesture, whatever the handle', () => {
      gizmo.armCopy();
      const adapter: any = gizmo;

      adapter.onMoveDragStart('plan');
      adapter.onMoveDrag('plan', new BABYLON.Vector3(1, 1, 0));
      adapter.onMoveDragEnd();

      expect(commands[0].kind).toBe('copy');
      expect(gizmo.isCopyArmed).toBe(false);
    });

    it('puts the armed copy down when pressed again', () => {
      gizmo.armCopy();
      gizmo.armCopy();

      expect(gizmo.isCopyArmed).toBe(false);
    });

    it('emits nothing for a copy put back where it started', () => {
      const adapter: any = gizmo;
      gizmo.setCtrlHeld(true);

      adapter.onMoveDragStart('x');
      adapter.onMoveDrag('x', new BABYLON.Vector3(0, 0, 0));
      adapter.onMoveDragEnd();

      expect(commands).toEqual([]);
    });

    it('is spent by the gesture it armed, even an abandoned one', () => {
      gizmo.armCopy();

      gizmo.beginMove();
      gizmo.cancel();

      expect(gizmo.isCopyArmed).toBe(false);
      expect(commands).toEqual([]);
    });
  });
```

- [ ] **Step 2: Run to verify failure** — `npx ng test webSmokeviewLib --watch=false --browsers=ChromeHeadless`.

- [ ] **Step 3: Implement** in `gizmo.service.ts`:

1. `Gesture` interface (after `face`):
```ts
    /** Whether the gesture leaves the original put and asks for copies (#126). */
    readonly copy: boolean,
```
2. Field next to `vertical`:
```ts
    /** Whether the ribbon armed the next gesture as a copy - one-shot (#126). */
    private copyPending = false;
```
3. Public API next to `setMode()`:
```ts
    /**
     * Arm the next move gesture as a copy - the ribbon's Copy button (#126).
     *
     * One-shot and toggleable: spent by the gesture it arms, put down by a
     * second press. The ctrl shortcut at an axis arrow does not come through
     * here - it is read at the grab (ADR-0011).
     */
    public armCopy(): void {
        this.copyPending = !this.copyPending;
    }

    public get isCopyArmed(): boolean {
        return this.copyPending;
    }
```
4. `beginMove` grows a parameter:
```ts
    public beginMove(copy = false): void {
        this.begin('move', undefined, copy);
    }
```
5. `begin(kind, face?, copy = false)`: build the gesture with
```ts
            copy: kind === 'move' && (copy || this.copyPending),
```
and immediately after `this.current = {...};` add `this.copyPending = false;`
6. `onMoveDragStart`:
```ts
    private onMoveDragStart(handle: MoveHandle): void {
        this.vertical = handle === 'plan' && this.ctrlHeld;
        // Ctrl at an axis arrow is spent on the copy, as at the plan square it
        // is spent on the vertical gesture (ADR-0011, amendment for #126)
        const copy = handle !== 'plan' && this.ctrlHeld;
        this.rawDragDelta.setAll(0);
        this.beginMove(copy);
        if (!this.current) { this.vertical = false; return; }

        if (this.vertical || this.current.copy) {
            // The ctrl that chose the mode is spent: its keydown suspended
            // snapping the way it does at a resize grip, and the gesture snaps
            // like any other until ctrl is pressed afresh.
            this.snapService.suspended = false;
        }
        if (this.vertical) { this.showGuide(); }
    }
```
7. `commandFor()` — the move branch becomes:
```ts
        if (gesture.kind === 'move') {
            const delta = this.resolvedDelta(gesture);
            if (delta.dx === 0 && delta.dy === 0 && delta.dz === 0) { return null; }
            return gesture.copy
                ? { kind: 'copy' as const, uuids: gesture.uuids, delta: delta }
                : { kind: 'move' as const, uuids: gesture.uuids, delta: delta };
        }
```
8. In `onSelectionChanged(selected)` (search for it below line 700) add as the first statement: `if (selected.length === 0) { this.copyPending = false; }` — an armed copy has nothing left to copy.
9. `cancel()`: the armed flag was already consumed into the gesture by `begin()`; nothing more to do (the test in Step 1 proves it).

- [ ] **Step 4: Run to verify pass** (both suites — the app compiles against the changed service).
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(gizmo): ctrl-at-arrow and armed copy-drag emit a copy command (#126)"`

---

### Task 5: The copies are selected after a copy-drag

**Files:**
- Modify: `projects/wizfds/src/app/views/main/fds/visualize/visualize.component.ts`
- Test: `projects/wizfds/src/app/views/main/fds/visualize/visualize.component.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
  it('selects the copies a copy-drag just made (#126)', () => {
    editStream.emit({ kind: 'copy', uuids: ['wall-uuid'], delta: { dx: 0, dy: 2, dz: 0 } });

    const copy: any = mainService.main.currentFdsScenario.fdsObject.geometry.obsts[1];
    expect(selection.selected).toEqual([{ uuid: copy.uuid, type: 'obst' }]);
  });
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement** in `visualize.component.ts`:

The subscription:
```ts
    this.commandSub = this.editStream.commands$
      .subscribe(command => {
        const change = this.fdsEdit.apply(command);
        if (command.kind === 'create' || command.kind === 'copy') { this.selectCreated(change); }
      });
```

`selectCreated` selects everything the change added (a copy-drag over a multi-selection adds several):
```ts
  private selectCreated(change: SceneChange | null): void {
    const created = (change?.added ?? []).map(added => ({
      uuid: added.element.uuid as string,
      type: added.type as FdsElementType
    }));
    if (created.length === 0) { return; }

    this.selectionService.setSelection(created);
  }
```

- [ ] **Step 4: Run to verify pass** (the existing `#125` selection test must stay green).
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(visualize): a copy-drag selects the copies it made (#126)"`

---

### Task 6: Ghost previews in PickService (library)

**Files:**
- Modify: `projects/web-smokeview-lib/src/lib/services/picking/pick.service.ts`
- Test: `projects/web-smokeview-lib/src/lib/services/picking/pick.service.spec.ts` (if the file does not exist, put the test in a new `describe` inside `gizmo.service.spec.ts`'s file? No — create `pick.service.spec.ts` is NOT needed; check first with Glob. If absent, test through the existing harness that already instantiates PickService — `gizmo.service.spec.ts` — as a separate top-level `describe('PickService ghost previews (#126)')` in a new spec file copying that file's `beforeEach` scene/engine setup.)

- [ ] **Step 1: Locate the internals** — read `pick.service.ts` around `outlineBox(` and the `SELECTED_COLOR` / `SELECTED_ALPHA` constants, and find where `selectionMeshes` are cleared on scene disposal (the `SceneScoped` reset method).

- [ ] **Step 2: Write the failing test** (adapted to the harness found in Step 1):

```ts
  describe('ghost previews (#126)', () => {
    it('draws one outline per box and clears them all', () => {
      picking.previewGhosts([
        { x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 },
        { x1: 2, x2: 3, y1: 0, y2: 1, z1: 0, z2: 1 }
      ]);

      expect(scene.meshes.filter(mesh => mesh.name.startsWith('ghost_')).length).toBe(2);

      picking.clearGhosts();

      expect(scene.meshes.filter(mesh => mesh.name.startsWith('ghost_')).length).toBe(0);
    });
  });
```

- [ ] **Step 3: Run to verify failure.**
- [ ] **Step 4: Implement** in `pick.service.ts`:

Constant next to `SELECTED_ALPHA`:
```ts
/** Fainter than the selection: a ghost is a proposal, not a state. */
const GHOST_ALPHA = 0.35;
```

Fields + methods (next to the preview section):
```ts
  /** The outlines of boxes that do not exist yet - an array or mirror preview (#126). */
  private ghostMeshes: BABYLON.Mesh[] = [];

  /**
   * Show where a clone-producing command would put its copies.
   *
   * Boxes and nothing else: the elements do not exist, so there is no uuid to
   * address them by. The app redraws the set on every change of the builder's
   * numbers and clears it when the builder closes.
   */
  public previewGhosts(boxes: readonly SceneXb[]): void {
    this.clearGhosts();
    if (!this.babylonService.scene) { return; }

    this.ghostMeshes = boxes.map((xb, index) =>
      this.outlineBox(xb, `ghost_${index}`, SELECTED_COLOR, GHOST_ALPHA));
  }

  /** Take the ghost outlines down. */
  public clearGhosts(): void {
    this.ghostMeshes.forEach(mesh => mesh.dispose());
    this.ghostMeshes = [];
  }
```
(Adjust the `outlineBox` call to its actual signature; guard against a missing scene the same way neighbouring code does.) Also call `this.ghostMeshes = [];` in the scene-disposal reset found in Step 1 — the meshes died with the scene.

- [ ] **Step 5: Run to verify pass.**
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(picking): ghost outlines for array and mirror previews (#126)"`

---

### Task 7: The ribbon's Copy button

**Files:**
- Modify: `projects/wizfds/src/app/views/main/fds/visualize/ribbon/ribbon.component.ts`
- Modify: `projects/wizfds/src/app/views/main/fds/visualize/ribbon/ribbon.component.html`
- Test: `projects/wizfds/src/app/views/main/fds/visualize/ribbon/ribbon.component.spec.ts`

- [ ] **Step 1: Write the failing test** (helper `cmd(label)` may already exist — if not, add):

```ts
  /** The command button carrying this label. */
  function cmd(label: string): HTMLButtonElement {
    return Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button.cmd'))
      .find(button => button.textContent.trim() === label);
  }

  describe('the Modify panel (#126)', () => {
    it('arms the gizmo to copy on the next gesture', () => {
      const gizmo = TestBed.inject(GizmoService);
      selection.select({ uuid: 'wall-uuid', type: 'obst' });
      fixture.detectChanges();

      cmd('Copy').click();

      expect(gizmo.isCopyArmed).toBe(true);
    });

    it('offers Copy, Array and Mirror only over a selection', () => {
      expect(cmd('Copy').disabled).toBe(true);
      expect(cmd('Array').disabled).toBe(true);
      expect(cmd('Mirror').disabled).toBe(true);
    });
  });
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement**

`ribbon.component.ts` — getter beside `moveTitle`:
```ts
  get copyTitle(): string {
    return this.canModify
      ? 'Copy the selection: arm and drag a handle, or hold ctrl and drag an axis arrow'
      : 'Nothing selected';
  }
```

`ribbon.component.html` — in the Modify panel, after the Delete button (ADR-0010 names the panel's six: move, resize, delete, copy, array, mirror):
```html
          <button type="button" class="cmd big" [class.on]="gizmo.isCopyArmed"
            [disabled]="!canModify" [title]="copyTitle" (click)="gizmo.armCopy()">
            <mat-icon svgIcon="content-copy" aria-hidden="true"></mat-icon><span>Copy</span>
          </button>
```
(The Array and Mirror buttons land in Tasks 8-9; for this task's second test add them disabled-only if implementing strictly in order — simpler: implement Tasks 7-9 as one commit series and run the pair test after Task 9. If keeping strict TDD, scope the second test to `cmd('Copy')` here and extend it in Task 8.)

- [ ] **Step 4: Run to verify pass.**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(ribbon): Copy arms the gizmo's next gesture (#126)"`

---

### Task 8: The Array builder tab

**Files:**
- Modify: `projects/wizfds/src/app/views/main/fds/visualize/ribbon/ribbon.component.ts`
- Modify: `projects/wizfds/src/app/views/main/fds/visualize/ribbon/ribbon.component.html`
- Test: `projects/wizfds/src/app/views/main/fds/visualize/ribbon/ribbon.component.spec.ts`

- [ ] **Step 1: Write the failing tests**

```ts
  describe('the Array builder (#126)', () => {
    function obsts(): any[] {
      return TestBed.inject(MainService).main.currentFdsScenario.fdsObject.geometry.obsts;
    }

    beforeEach(() => {
      selection.select({ uuid: 'wall-uuid', type: 'obst' });
      fixture.detectChanges();
    });

    it('opens a contextual ARRAY tab with counts and spacings', () => {
      cmd('Array').click();
      fixture.detectChanges();

      expect(component.active).toBe('array');
      expect(tabLabels()).toContain('ARRAY');
      // Spacing defaults to the selection's own size, so the copies stand
      // shoulder to shoulder until told otherwise
      expect(component.arrayForm.spacing.x).toBe(4);
    });

    it('commits the whole array as one command, and selects the copies', () => {
      const history = TestBed.inject(HistoryService);
      cmd('Array').click();
      component.setArrayCount('x', 12);
      component.setArraySpacing('x', 1.5);

      component.commitArray();
      fixture.detectChanges();

      expect(obsts().length).toBe(12);
      expect(history.undoLabel).toBe('Array of 12');
      expect(selection.selected.length).toBe(11);
      expect(component.active).toBe('home');
    });

    it('closes without a trace on Cancel', () => {
      cmd('Array').click();

      component.closeBuilder();
      fixture.detectChanges();

      expect(component.arrayForm).toBeNull();
      expect(obsts().length).toBe(1);
      expect(component.active).toBe('home');
    });

    it('closes when the selection changes out from under it', () => {
      cmd('Array').click();

      selection.clear();
      fixture.detectChanges();

      expect(component.arrayForm).toBeNull();
    });
  });
```
Add `HistoryService` to the spec imports (`@services/history/history.service`).

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement**

`ribbon.component.ts`:
- Widen the tab type: `export type RibbonTabId = 'home' | 'view' | 'measure' | 'context' | 'array' | 'mirror';`
- Imports: `boxOf`, `arraySlots`, `arrayCount`, `shiftedBox`, `ElementBox` from `@services/elements/element-geometry`; `SceneChange` from `../../../../../../../../web-smokeview-lib/src/lib/services/drawing/scene-change`; `PickService` from `.../picking/pick.service`; `FdsElementType` is already available via the elements import.
- Constructor: add `private picking: PickService` (private — the template never touches it).
- State + methods (new section after the Modify getters):

```ts
  // ==========================================
  // Array and Mirror builders (#126)
  // ==========================================

  /** The rectangular array being built, while its tab is open. */
  arrayForm: {
    counts: { x: number, y: number, z: number },
    spacing: { x: number, y: number, z: number }
  } | null = null;

  /** Whether the counts describe anything beyond the original. */
  get arrayHasCopies(): boolean {
    const form = this.arrayForm;
    return !!form && arraySlots(form.counts).length > 0 && this.selected.length > 0;
  }

  startArray(): void {
    if (!this.canModify) { return; }

    const bounds = this.selectionBounds();
    this.arrayForm = {
      counts: { x: 2, y: 1, z: 1 },
      // The selection's own size: the copies stand shoulder to shoulder
      // until told otherwise
      spacing: {
        x: round3(bounds.x2 - bounds.x1),
        y: round3(bounds.y2 - bounds.y1),
        z: round3(bounds.z2 - bounds.z1)
      }
    };
    this.active = 'array';
    this.previewBuilder();
  }

  setArrayCount(axis: SceneAxis, value: number): void {
    if (!this.arrayForm) { return; }
    this.arrayForm.counts[axis] = Number(value) || 1;
    this.previewBuilder();
  }

  setArraySpacing(axis: SceneAxis, value: number): void {
    if (!this.arrayForm) { return; }
    this.arrayForm.spacing[axis] = Number(value) || 0;
    this.previewBuilder();
  }

  commitArray(): void {
    const form = this.arrayForm;
    if (!form || !this.arrayHasCopies) { return; }

    const change = this.fdsEdit.apply({
      kind: 'array', uuids: this.selected.map(element => element.uuid),
      counts: { ...form.counts }, spacing: { ...form.spacing }
    });
    this.closeBuilder();
    this.selectAdded(change);
  }

  /** Close whichever builder is open, ghosts and all. */
  closeBuilder(): void {
    if (!this.arrayForm && !this.mirrorForm) { return; }

    this.arrayForm = null;
    this.mirrorForm = null;
    this.picking.clearGhosts();
    if (this.active === 'array' || this.active === 'mirror') { this.active = 'home'; }
  }

  /** The ghosts: where the open builder would put its copies. */
  private previewBuilder(): void {
    if (this.arrayForm) {
      const form = this.arrayForm;
      const ghosts: ElementBox[] = [];
      this.selectionBoxes().forEach(xb =>
        arraySlots(form.counts).forEach(slot => ghosts.push(shiftedBox(xb,
          slot.ix * form.spacing.x, slot.iy * form.spacing.y, slot.iz * form.spacing.z))));
      this.picking.previewGhosts(ghosts);
    }
  }

  /** What a committed builder leaves selected: what it made. */
  private selectAdded(change: SceneChange | null): void {
    const added = (change?.added ?? []).map(drawn => ({
      uuid: drawn.element.uuid as string,
      type: drawn.type as FdsElementType
    }));
    if (added.length > 0) { this.selection.setSelection(added); }
  }

  /** The boxes of everything selected, as the scenario holds them. */
  private selectionBoxes(): ElementBox[] {
    return this.selected
      .map(element => this.elements.byUuid(element.uuid))
      .filter(found => !!found)
      .map(found => boxOf(found.type, found.element))
      .filter((xb): xb is ElementBox => !!xb);
  }

  /** The box the whole selection occupies. */
  private selectionBounds(): ElementBox {
    const boxes = this.selectionBoxes();
    return {
      x1: Math.min(...boxes.map(xb => xb.x1)), x2: Math.max(...boxes.map(xb => xb.x2)),
      y1: Math.min(...boxes.map(xb => xb.y1)), y2: Math.max(...boxes.map(xb => xb.y2)),
      z1: Math.min(...boxes.map(xb => xb.z1)), z2: Math.max(...boxes.map(xb => xb.z2))
    };
  }
```
(`mirrorForm` is declared in Task 9 — declare it here as `mirrorForm: ... | null = null;` with its type stub, or implement 8+9 back-to-back; simplest is to declare the full `mirrorForm` field in this task and fill in its methods in Task 9.)

Module-level helper at the bottom of the file:
```ts
/** Millimetre-rounded, so a derived default reads like a number a user typed. */
function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
```

- In `ngOnInit`, the selection subscription becomes:
```ts
    this.subs.push(this.selection.selected$.subscribe(selected => {
      this.selected = selected;
      // A builder is a proposal over the selection it was opened on
      this.closeBuilder();
      // The contextual tab goes with the selection it was named after
      if (selected.length === 0 && this.active === 'context') { this.active = 'home'; }
    }));
```
Note: `closeBuilder()` early-returns when no builder is open, so plain selection traffic is untouched. **The commit path must close the builder BEFORE `selectAdded()`** (it does — see `commitArray`).
- Refactor `zoomToSelection()` to use `selectionBounds()` (it currently reads `element.xb` directly and misses fires):
```ts
  zoomToSelection(): void {
    if (this.selectionBoxes().length === 0) { return; }
    this.view.zoomTo(this.selectionBounds());
  }
```

`ribbon.component.html`:
- Modify panel, after the Copy button:
```html
          <button type="button" class="cmd big" [class.on]="!!arrayForm" [disabled]="!canModify"
            [title]="canModify ? 'Lay copies of the selection out on a grid' : 'Nothing selected'"
            (click)="startArray()">
            <mat-icon svgIcon="dots-grid" aria-hidden="true"></mat-icon><span>Array</span>
          </button>
```
- Tab strip, after the contextual tab button:
```html
    <button type="button" class="tab contextual" role="tab" *ngIf="arrayForm"
      [class.active]="active === 'array'" [attr.aria-selected]="active === 'array'"
      (click)="select('array')">ARRAY</button>
```
- Panels, a new `*ngSwitchCase="'array'"` before the contextual case:
```html
    <!-- ---------- Array builder (#126) ------------------------------------- -->
    <ng-container *ngSwitchCase="'array'">
      <section class="panel">
        <div class="panel-body column tight">
          <div class="field" *ngFor="let axis of axes">
            <label>N{{ axis }}</label>
            <input type="number" min="1" step="1" [ngModel]="arrayForm.counts[axis]"
              (ngModelChange)="setArrayCount(axis, $event)"
              [attr.aria-label]="'Count along ' + axis" />
          </div>
        </div>
        <div class="panel-title">Counts</div>
      </section>
      <section class="panel">
        <div class="panel-body column tight">
          <div class="field" *ngFor="let axis of axes">
            <label>d{{ axis }}</label>
            <input type="number" step="0.1" [ngModel]="arrayForm.spacing[axis]"
              (ngModelChange)="setArraySpacing(axis, $event)"
              [attr.aria-label]="'Spacing along ' + axis" />
          </div>
        </div>
        <div class="panel-title">Spacing [m]</div>
      </section>
      <section class="panel">
        <div class="panel-body">
          <button type="button" class="cmd big" [disabled]="!arrayHasCopies"
            title="Create the array - one entry in the history" (click)="commitArray()">
            <mat-icon svgIcon="check" aria-hidden="true"></mat-icon><span>OK</span>
          </button>
          <button type="button" class="cmd big" title="Abandon the array"
            (click)="closeBuilder()">
            <mat-icon svgIcon="close" aria-hidden="true"></mat-icon><span>Cancel</span>
          </button>
        </div>
        <div class="panel-title">Array</div>
      </section>
    </ng-container>
```
(`axes` is `readonly SceneAxis[]` — already on the component.) Check `.field input` styling in `ribbon.component.scss` — the `select` styling exists; if `input[type=number]` looks unstyled, extend the `.field` rule to cover `input` the same way.

- [ ] **Step 4: Run to verify pass.**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(ribbon): Array builder tab with live ghost preview (#126)"`

---

### Task 9: The Mirror builder tab

**Files:** same three as Task 8.

- [ ] **Step 1: Write the failing tests**

```ts
  describe('the Mirror builder (#126)', () => {
    function obsts(): any[] {
      return TestBed.inject(MainService).main.currentFdsScenario.fdsObject.geometry.obsts;
    }

    beforeEach(() => {
      selection.select({ uuid: 'wall-uuid', type: 'obst' });
      fixture.detectChanges();
      cmd('Mirror').click();
      fixture.detectChanges();
    });

    it('opens on the selection centre, keeping the original', () => {
      expect(component.active).toBe('mirror');
      expect(component.mirrorForm.axis).toBe('x');
      // The wall spans x 0..4, so its centre plane stands at 2
      expect(component.mirrorForm.coordinate).toBe(2);
      expect(component.mirrorForm.keepOriginal).toBe(true);
    });

    it('re-derives the coordinate when the axis changes', () => {
      component.setMirrorAxis('z');

      expect(component.mirrorForm.coordinate).toBe(1.5);
    });

    it('commits a kept mirror and selects the copy', () => {
      component.setMirrorCoordinate(5);

      component.commitMirror();
      fixture.detectChanges();

      expect(obsts().length).toBe(2);
      expect((obsts()[1] as any).xb.x1).toBe(6);
      expect(selection.selected.length).toBe(1);
      expect(selection.selected[0].uuid).toBe((obsts()[1] as any).uuid);
    });

    it('moves the original when told not to keep it', () => {
      component.setMirrorCoordinate(5);
      component.toggleMirrorKeep();

      component.commitMirror();
      fixture.detectChanges();

      expect(obsts().length).toBe(1);
      expect((obsts()[0] as any).xb.x1).toBe(6);
      expect(selection.selected.map(element => element.uuid)).toEqual(['wall-uuid']);
    });
  });
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement**

`ribbon.component.ts` — fill in the mirror half (import `mirroredBox` from element-geometry; `SceneAxis` is already imported):

```ts
  /** The mirror being built, while its tab is open. */
  mirrorForm: { axis: SceneAxis, coordinate: number, keepOriginal: boolean } | null = null;

  startMirror(): void {
    if (!this.canModify) { return; }

    const bounds = this.selectionBounds();
    this.mirrorForm = {
      axis: 'x',
      coordinate: round3((bounds.x1 + bounds.x2) / 2),
      keepOriginal: true
    };
    this.active = 'mirror';
    this.previewBuilder();
  }

  setMirrorAxis(axis: SceneAxis): void {
    if (!this.mirrorForm) { return; }
    const bounds = this.selectionBounds();
    this.mirrorForm.axis = axis;
    // The centre on the new axis: the plane the user most often means
    this.mirrorForm.coordinate = round3((bounds[`${axis}1`] + bounds[`${axis}2`]) / 2);
    this.previewBuilder();
  }

  setMirrorCoordinate(value: number): void {
    if (!this.mirrorForm) { return; }
    this.mirrorForm.coordinate = Number(value) || 0;
    this.previewBuilder();
  }

  /** Put the plane at the selection's near face, centre or far face. */
  setMirrorPlaneAt(where: '1' | 'mid' | '2'): void {
    if (!this.mirrorForm) { return; }
    const axis = this.mirrorForm.axis;
    const bounds = this.selectionBounds();
    this.mirrorForm.coordinate = where === 'mid'
      ? round3((bounds[`${axis}1`] + bounds[`${axis}2`]) / 2)
      : bounds[`${axis}${where}`];
    this.previewBuilder();
  }

  toggleMirrorKeep(): void {
    if (!this.mirrorForm) { return; }
    this.mirrorForm.keepOriginal = !this.mirrorForm.keepOriginal;
  }

  commitMirror(): void {
    const form = this.mirrorForm;
    if (!form || this.selected.length === 0) { return; }

    const change = this.fdsEdit.apply({
      kind: 'mirror', uuids: this.selected.map(element => element.uuid),
      axis: form.axis, coordinate: form.coordinate, keepOriginal: form.keepOriginal
    });
    const keep = form.keepOriginal;
    this.closeBuilder();
    if (keep) { this.selectAdded(change); }
  }
```

`previewBuilder()` grows the mirror branch:
```ts
    if (this.mirrorForm) {
      const form = this.mirrorForm;
      this.picking.previewGhosts(this.selectionBoxes()
        .map(xb => mirroredBox(xb, form.axis, form.coordinate)));
    }
```

**Watch out:** `commitMirror` with `keepOriginal: false` fires `applied$`, which does NOT change the selection (the elements moved, they did not go away) — but `closeBuilder()` runs against a selection that still stands, and the earlier `selected$`-closes-builder subscription only fires if the selection actually changes. The explicit `closeBuilder()` in `commitMirror` covers it.

`ribbon.component.html`:
- Modify panel, after Array:
```html
          <button type="button" class="cmd big" [class.on]="!!mirrorForm" [disabled]="!canModify"
            [title]="canModify ? 'Mirror the selection about an axis-aligned plane' : 'Nothing selected'"
            (click)="startMirror()">
            <mat-icon svgIcon="flip-horizontal" aria-hidden="true"></mat-icon><span>Mirror</span>
          </button>
```
- Tab strip, after the ARRAY tab:
```html
    <button type="button" class="tab contextual" role="tab" *ngIf="mirrorForm"
      [class.active]="active === 'mirror'" [attr.aria-selected]="active === 'mirror'"
      (click)="select('mirror')">MIRROR</button>
```
- Panels, `*ngSwitchCase="'mirror'"` after the array case:
```html
    <!-- ---------- Mirror builder (#126) ------------------------------------ -->
    <ng-container *ngSwitchCase="'mirror'">
      <section class="panel">
        <div class="panel-body column tight">
          <div class="field" title="The plane is perpendicular to this axis">
            <label>Axis</label>
            <select [ngModel]="mirrorForm.axis" (ngModelChange)="setMirrorAxis($event)"
              aria-label="Mirror plane axis">
              <option value="x">x</option>
              <option value="y">y</option>
              <option value="z">z</option>
            </select>
          </div>
          <div class="field" title="Where the plane stands, in metres">
            <label>{{ mirrorForm.axis }} =</label>
            <input type="number" step="0.1" [ngModel]="mirrorForm.coordinate"
              (ngModelChange)="setMirrorCoordinate($event)"
              aria-label="Mirror plane coordinate" />
          </div>
          <div class="panel-body tight">
            <button type="button" class="cmd" (click)="setMirrorPlaneAt('1')"
              title="The selection's near face">Min</button>
            <button type="button" class="cmd" (click)="setMirrorPlaneAt('mid')"
              title="Through the selection's centre">Centre</button>
            <button type="button" class="cmd" (click)="setMirrorPlaneAt('2')"
              title="The selection's far face">Max</button>
          </div>
        </div>
        <div class="panel-title">Plane</div>
      </section>
      <section class="panel">
        <div class="panel-body">
          <button type="button" class="cmd wide" [class.on]="mirrorForm.keepOriginal"
            (click)="toggleMirrorKeep()" title="Keep the original as well as the mirror">
            <mat-icon [svgIcon]="mirrorForm.keepOriginal
              ? 'checkbox-marked-outline' : 'checkbox-blank-outline'" aria-hidden="true"></mat-icon>
            <span>Keep original</span>
          </button>
          <button type="button" class="cmd big"
            title="Create the mirror - one entry in the history" (click)="commitMirror()">
            <mat-icon svgIcon="check" aria-hidden="true"></mat-icon><span>OK</span>
          </button>
          <button type="button" class="cmd big" title="Abandon the mirror"
            (click)="closeBuilder()">
            <mat-icon svgIcon="close" aria-hidden="true"></mat-icon><span>Cancel</span>
          </button>
        </div>
        <div class="panel-title">Mirror</div>
      </section>
    </ng-container>
```

- [ ] **Step 4: Run to verify pass** (whole wizfds suite).
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(ribbon): Mirror builder tab with plane presets (#126)"`

---

### Task 10: Help card and the ADR amendments

**Files:**
- Modify: `projects/wizfds/src/app/views/main/fds/visualize/ribbon/ribbon.component.html`
- Modify: `docs/adr/0011-mapa-modyfikatorow-gestow.md`
- Modify: `docs/adr/0010-ribbon-i-biblioteka-jako-kanwa.md`

- [ ] **Step 1: Help card** — after the "Move / resize" row:
```html
      <tr><td>Copy</td><td>ctrl + drag an axis arrow; or Copy in Modify, then any handle</td></tr>
```

- [ ] **Step 2: ADR-0011 amendment** — append:

```markdown

## Uzupełnienie (2026-08-04) — co zmieniło #126

Kopiowanie przez przeciągnięcie potrzebowało modyfikatora, a ctrl przy chwycie
strzałki osi niósł znaczenie najsłabsze z całej mapy: „start z zawieszonym
snapem", osiągalne także świeżym dociśnięciem ctrl tuż po chwycie. To znaczenie
oddaje miejsce kopii:

| Klawisz | Przy chwycie uchwytu |
|---|---|
| **Ctrl** | na kwadracie planu: gest pionowy (bez zmian); **na strzałkach osi: kopia** — oryginał zostaje, snap i dynamic input działają jak przy przesunięciu; na trójkątach resize: start z zawieszonym snapem (bez zmian) |

- Zasada „ctrl decyduje w chwili chwytu i jest tym wyborem zużyty" obejmuje
  kopię: gest kopiujący snapuje normalnie, a snap zawiesza dopiero ctrl
  dociśnięty na świeżo w trakcie gestu.
- Kopia w planie (kwadratem) nie ma skrótu klawiszowego — ctrl na kwadracie
  pozostaje pionem. Drogą jest przycisk **Copy** w panelu Modify, który uzbraja
  następny gest (dowolnym uchwytem, także nudge) jako kopiujący; uzbrojenie
  jest jednorazowe i zdejmowane ponownym kliknięciem.
```

- [ ] **Step 3: ADR-0010 amendment** — append:

```markdown

## Uzupełnienie (2026-08-04) — co odblokowało #126

Panel Modify jest w komplecie: obok Move / Resize / Delete stoją Copy, Array
i Mirror — trzy komendy, które ta decyzja przewidziała od początku.

- **Copy** uzbraja następny gest gizma jako kopiujący; skrótem jest ctrl przy
  chwycie strzałki osi (aneks w ADR-0011).
- **Array i Mirror są budowane w zakładkach kontekstowych** (ARRAY / MIRROR):
  liczności i odstępy — albo oś, współrzędna płaszczyzny i „keep original" —
  wpisuje się w panelach, duchy pokazują wynik na żywo, OK zatwierdza jedną
  komendą (jedno wejście w historii, ADR-0009), Cancel i zmiana zaznaczenia
  zamykają budowniczego.
- Wskazanie płaszczyzny odbicia kliknięciem ze snapem odłożono: pole
  współrzędnej z presetami Min / Centre / Max pokrywa typowe przypadki;
  wskazanie punktu w kanwie wymaga narzędzia „wskaż punkt", którego biblioteka
  jeszcze nie ma.
```

- [ ] **Step 4: Commit** — `git add -A && git commit -m "docs: modifier-map and ribbon ADR amendments for copy/array/mirror (#126)"`

---

### Task 11: Full verification and hand-off

- [ ] **Step 1:** `npx ng test wizfds --watch=false --browsers=ChromeHeadless` — green.
- [ ] **Step 2:** `npx ng test webSmokeviewLib --watch=false --browsers=ChromeHeadless` — green.
- [ ] **Step 3:** `npm run wizFds:build-prod` — compiles.
- [ ] **Step 4:** Rename the branch and push:
```bash
git branch -m feat/copy-array-mirror
git push -u origin feat/copy-array-mirror
```
- [ ] **Step 5:** Open a PR (English) titled `feat: copy, rectangular array and mirror (#126)`; body lists the three commands, the ADR-0011 amendment (ctrl-at-arrow), the deferred snap-placed mirror plane, and closes #126.

---

## Self-review notes

- **Spec coverage:** copy-drag ✓ (arrows + armed button; plan-square deviation documented), fresh uuid/id/no idAC ✓ (Task 1), snapping/dynamic input as in move ✓ (Task 4 suspension test), array counts/spacings in contextual tab ✓ (Task 8), live preview ✓ (Tasks 6+8), one command/one undo ✓ (Tasks 1-3 tests), mirror three planes ✓ (Task 3), keep/drop original ✓, plane typed ✓ / snap-placed deferred (documented), id collisions ✓ (clonePatches numbering; `rewriteIds` only fills empty ids so no CadService change), history size: bounded by MAX_HISTORY_DEPTH=50, patches carry full `toJSON()` per copy — noted in PR.
- **Types:** `SceneAxis` = `'x'|'y'|'z'` (scene-bounds.service); edit-command uses inline literals to stay import-clean. `ElementBox` vs `SceneXb` are structurally identical — `previewGhosts` takes `SceneXb`, app passes `ElementBox`; both are the same six numbers.
