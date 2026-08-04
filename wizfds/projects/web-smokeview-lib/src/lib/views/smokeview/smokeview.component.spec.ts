import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { BehaviorSubject } from 'rxjs';

import * as BABYLON from 'babylonjs';

import { BabylonService } from '../../services/babylon/babylon.service';
import { ViewCubeService } from '../../services/babylon/viewCube/view-cube.service';
import { PickService } from '../../services/picking/pick.service';
import { GizmoService } from '../../services/editing/gizmo.service';
import { SmokeviewComponent } from './smokeview.component';

describe('SmokeviewComponent', () => {
  let component: SmokeviewComponent;
  let fixture: ComponentFixture<SmokeviewComponent>;

  let originalGpuDescriptor: PropertyDescriptor | undefined;

  /**
   * Builds the component with a stubbed BabylonService, so no engine is created
   * in the test browser. `hasGpu` drives navigator.gpu, which is what the
   * component reads through BabylonService.isWebGPUSupported() in ngOnInit.
   */
  const configure = async (hasGpu: boolean) => {
    Object.defineProperty(navigator, 'gpu', { value: hasGpu ? {} : undefined, configurable: true });

    const babylonStub: Partial<BabylonService> = {
      webGPUAvailable: hasGpu,
      scene$: new BehaviorSubject<any>(null),
      createScene: () => Promise.resolve(),
      disposeScene: () => { },
      animate: () => { },
      engine: null,
      scene: null
    };

    await TestBed.configureTestingModule({
      imports: [FormsModule, MatIconModule],
      declarations: [SmokeviewComponent],
      providers: [{ provide: BabylonService, useValue: babylonStub }]
    }).compileComponents();

    fixture = TestBed.createComponent(SmokeviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(() => {
    originalGpuDescriptor = Object.getOwnPropertyDescriptor(navigator, 'gpu');
  });

  afterEach(() => {
    if (originalGpuDescriptor) {
      Object.defineProperty(navigator, 'gpu', originalGpuDescriptor);
    } else {
      delete (navigator as any).gpu;
    }
  });

  it('should create', async () => {
    await configure(true);
    expect(component).toBeTruthy();
  });

  it('shows an explicit message when the browser has no WebGPU', async () => {
    await configure(false);

    const message = fixture.nativeElement.querySelector('.unsupported');
    expect(message).toBeTruthy();
    expect(message.textContent).toContain('WebGPU');
  });

  it('does not even try to create a scene without WebGPU', async () => {
    const createScene = jasmine.createSpy('createScene').and.returnValue(Promise.resolve());
    Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true });

    await TestBed.configureTestingModule({
      imports: [FormsModule, MatIconModule],
      declarations: [SmokeviewComponent],
      providers: [{
        provide: BabylonService,
        useValue: {
          webGPUAvailable: false,
          scene$: new BehaviorSubject<any>(null),
          createScene,
          disposeScene: () => { },
          animate: () => { },
          engine: null,
          scene: null
        }
      }]
    }).compileComponents();

    fixture = TestBed.createComponent(SmokeviewComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(createScene).not.toHaveBeenCalled();
  });

  it('draws the canvas when WebGPU is available', async () => {
    await configure(true);

    expect(fixture.nativeElement.querySelector('.unsupported')).toBeNull();
    expect(fixture.nativeElement.querySelector('canvas.renderer').hidden).toBe(false);
  });

  it('holds no controls of its own - those belong to the host (ADR-0010)', async () => {
    // The visibility menu, the section sliders, the help table and the panel
    // naming what was picked all moved into the host's ribbon and properties
    // palette. Leaving a copy behind would mean two places to forget to add the
    // next switch to, and two answers about what is currently on screen.
    await configure(true);

    ['.menu', '.clip', '.help', '.info'].forEach(selector => {
      expect(fixture.nativeElement.querySelector(selector))
        .withContext(`${selector} still in the library`).toBeNull();
    });
  });

  /**
   * The dynamic input must never stand between the mouse and the canvas (#124).
   *
   * It appears at the cursor the moment a gesture starts, and it is a sibling
   * of the canvas - so a pointermove that hits it bubbles up past the canvas,
   * and Babylon, whose listeners sit on the canvas element, never sees the
   * move. The observed result: a drag starts (the press landed on the canvas,
   * the panel was not up yet) and then freezes on the first move. Typing needs
   * no clicks - the field is focused programmatically and Tab walks on.
   */
  describe('the dynamic input overlay', () => {
    it('lets every pointer event fall through to the canvas', async () => {
      await configure(true);
      component.gesture = {
        kind: 'move', activeKey: 'dx', at: { x: 100, y: 100 }, snap: null,
        fields: [{ key: 'dx', label: 'dX', value: 0, typed: false }]
      } as any;
      fixture.detectChanges();

      const panel: HTMLElement = fixture.nativeElement.querySelector('.dynamic-input');
      expect(panel).toBeTruthy();
      expect(getComputedStyle(panel).pointerEvents).toBe('none');

      const field: HTMLElement = panel.querySelector('input');
      expect(getComputedStyle(field).pointerEvents).toBe('none');
    });

    it('never takes the focus - the canvas blur would end the drag', async () => {
      // Babylon answers the canvas losing focus by synthesising a release of
      // every held button (WebDeviceInputSystem._pointerBlurEvent), so a panel
      // that focused its field killed the very gesture it was reporting on.
      await configure(true);
      (document.activeElement as HTMLElement)?.blur?.();

      component.gesture = {
        kind: 'move', activeKey: 'dx', at: { x: 100, y: 100 }, snap: null,
        fields: [{ key: 'dx', label: 'dX', value: 0, typed: false }]
      } as any;
      fixture.detectChanges();
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(document.activeElement === document.body
        || document.activeElement === null).toBe(true);
    });

    it('routes typing through the window, straight into the gesture', async () => {
      await configure(true);
      const gizmo = TestBed.inject(GizmoService);
      const typed = spyOn(gizmo, 'type');
      const tabbed = spyOn(gizmo, 'nextField');

      component.gesture = {
        kind: 'move', activeKey: 'dx', at: { x: 100, y: 100 }, snap: null,
        fields: [{ key: 'dx', label: 'dX', value: 0, typed: false }]
      } as any;
      fixture.detectChanges();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ',' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));

      // The comma types as a decimal point - the numeric keypad of a Polish
      // keyboard produces one
      expect(typed.calls.allArgs()).toEqual([['dx', '5'], ['dx', '5.']]);
      expect(tabbed).toHaveBeenCalled();
    });
  });

  /**
   * Escape, layered the way AutoCAD layers it (CONTEXT.md, "Escape
   * (warstwowo)"): a running gesture is abandoned first; with none running,
   * the selection is dropped - in the app that owns it, exactly like a click
   * on empty space.
   */
  describe('Escape', () => {
    it('abandons a running gesture and leaves the selection alone', async () => {
      await configure(true);
      const gizmo = TestBed.inject(GizmoService);
      spyOnProperty(gizmo, 'isDragging', 'get').and.returnValue(true);
      const cancelled = spyOn(gizmo, 'cancel');
      const dropped = spyOn(TestBed.inject(PickService), 'dropSelection');

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(cancelled).toHaveBeenCalled();
      expect(dropped).not.toHaveBeenCalled();
    });

    it('drops the selection when no gesture is running', async () => {
      await configure(true);
      const dropped = spyOn(TestBed.inject(PickService), 'dropSelection');

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(dropped).toHaveBeenCalled();
    });

    it('leaves the selection alone while the user is typing in a form field', async () => {
      // Escape in a host form means "leave this field", not "drop what the
      // 3D view has selected" - same guard the nudge keys already carry
      await configure(true);
      const dropped = spyOn(TestBed.inject(PickService), 'dropSelection');
      const field = document.createElement('input');
      document.body.appendChild(field);

      field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(dropped).not.toHaveBeenCalled();
      field.remove();
    });
  });

  /**
   * The pointer gestures: what selects, what belongs to the camera, and what the
   * chrome layered over the canvas must never do.
   *
   * Since #121 a plain click selects, which puts the pick on pointerup - so where
   * the press landed, which button it was, and how far it travelled all decide
   * whether anything is selected at all.
   */
  describe('pointer gestures', () => {
    let picking: jasmine.SpyObj<PickService>;
    let engine: BABYLON.NullEngine;
    let scene: BABYLON.Scene;
    /** Counts the zoom extents the double middle press asked for (ADR-0012). */
    let zoomExtents: jasmine.Spy;
    /** The cube, as the component drives it: picked and lit on hover. */
    let viewCube: { pickSide: jasmine.Spy, highlight: jasmine.Spy, init: () => void };

    /** The canvas the scene is drawn on - the only surface a pick may come from. */
    const canvas = (): HTMLCanvasElement =>
      fixture.nativeElement.querySelector('canvas.renderer');

    const press = (target: EventTarget, options: PointerEventInit = {}) =>
      target.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, clientX: 100, clientY: 100, button: 0, ...options
      }));

    const release = (target: EventTarget, options: PointerEventInit = {}) =>
      target.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, clientX: 100, clientY: 100, button: 0, ...options
      }));

    beforeEach(async () => {
      Object.defineProperty(navigator, 'gpu', { value: {}, configurable: true });

      zoomExtents = jasmine.createSpy('zoomExtents');
      viewCube = {
        pickSide: jasmine.createSpy('pickSide').and.returnValue(null),
        highlight: jasmine.createSpy('highlight'),
        init: () => { }
      };
      engine = new BABYLON.NullEngine();
      scene = new BABYLON.Scene(engine);
      // A real camera: the ray is built through scene.createPickingRay()
      const camera = new BABYLON.ArcRotateCamera(
        'camera', 0, Math.PI / 3, 10, BABYLON.Vector3.Zero(), scene);

      picking = jasmine.createSpyObj<PickService>(
        'PickService',
        ['pick', 'hover', 'clearHover', 'clearSelection', 'setSelected', 'bind',
          'previewMove', 'previewBox', 'endPreview'],
        // The gizmo stands on the selection and is told about it here (#124)
        { selection$: new BehaviorSubject<any>([]) });

      await TestBed.configureTestingModule({
        imports: [FormsModule, MatIconModule],
        declarations: [SmokeviewComponent],
        providers: [
          {
            provide: BabylonService,
            useValue: {
              webGPUAvailable: true,
              scene: scene,
              camera: camera,
              scene$: new BehaviorSubject<any>(null),
              createScene: () => Promise.resolve(),
              disposeScene: () => { },
              animate: () => { },
              zoomExtents
            }
          },
          { provide: ViewCubeService, useValue: viewCube },
          { provide: PickService, useValue: picking }
        ]
      }).compileComponents();

      fixture = TestBed.createComponent(SmokeviewComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      await fixture.whenStable();
    });

    afterEach(() => {
      scene.dispose();
      engine.dispose();
    });

    it('selects on a plain click in the scene', () => {
      press(canvas());
      release(canvas());

      expect(picking.pick).toHaveBeenCalledTimes(1);
      expect(picking.pick.calls.mostRecent().args[1]).toEqual({ add: false });
    });

    it('leaves a drag to the camera', () => {
      press(canvas(), { clientX: 100, clientY: 100 });
      release(canvas(), { clientX: 140, clientY: 118 });

      expect(picking.pick).not.toHaveBeenCalled();
    });

    it('extends the selection on ctrl, and on shift', () => {
      press(canvas());
      release(canvas(), { ctrlKey: true });
      press(canvas());
      release(canvas(), { shiftKey: true });

      expect(picking.pick.calls.allArgs().map(args => args[1]))
        .toEqual([{ add: true }, { add: true }]);
    });

    it('ignores a right-click, which is reserved for a future menu (ADR-0012)', () => {
      press(canvas(), { button: 2 });
      release(canvas(), { button: 2 });

      expect(picking.pick).not.toHaveBeenCalled();
    });

    it('zooms to extents on a double middle press', () => {
      // AutoCAD's gesture: two quick presses of the wheel frame the whole model
      press(canvas(), { button: 1 });
      press(canvas(), { button: 1 });

      expect(zoomExtents).toHaveBeenCalledTimes(1);
    });

    it('a single middle press is a pan, not a zoom, and never selects', () => {
      press(canvas(), { button: 1 });
      release(canvas(), { button: 1 });

      expect(zoomExtents).not.toHaveBeenCalled();
      expect(picking.pick).not.toHaveBeenCalled();
    });

    it('two middle presses apart in space are two pans, not a pair', () => {
      // A pan put down and picked up on the other side of the model
      press(canvas(), { button: 1, clientX: 100, clientY: 100 });
      press(canvas(), { button: 1, clientX: 300, clientY: 240 });

      expect(zoomExtents).not.toHaveBeenCalled();
    });

    it('does not pick when the press landed on the chrome over the canvas', () => {
      // The player controls, and whatever a gesture lays over the canvas, sit in
      // this component above it. A press on one of them is not a press in the
      // scene - and it would otherwise pick at whatever pointer position the
      // scene last saw, so it would usually miss and clear the selection.
      press(fixture.nativeElement);
      release(fixture.nativeElement);

      expect(picking.pick).not.toHaveBeenCalled();
    });

    it('does not hover while the pointer is down - that gesture is the camera\'s', () => {
      press(canvas());
      canvas().dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));

      expect(picking.hover).not.toHaveBeenCalled();
    });

    it('drops the hover when the pointer leaves the canvas', () => {
      canvas().dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));

      expect(picking.clearHover).toHaveBeenCalled();
    });

    it('lights the cube part under the pointer as it moves', async () => {
      // The cube's own hover died with tuneForStaticScene() - Babylon no
      // longer picks the scene on pointer moves, so the ActionManager
      // triggers never fired. The component's throttled hover drives it now.
      viewCube.pickSide.and.returnValue('top');

      canvas().dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
      await new Promise(resolve => requestAnimationFrame(resolve));

      expect(viewCube.highlight).toHaveBeenCalledWith('top');
    });

    it('puts the cube light out when the pointer leaves the canvas', () => {
      canvas().dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));

      expect(viewCube.highlight).toHaveBeenCalledWith(null);
    });
  });

  // The section planes moved out with the sliders that drive them; what used to
  // be tested here is SceneViewService's now - see its spec.
});
