import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { BehaviorSubject } from 'rxjs';

import * as BABYLON from 'babylonjs';

import { BabylonService } from '../../services/babylon/babylon.service';
import { ViewCubeService } from '../../services/babylon/viewCube/view-cube.service';
import { PickService } from '../../services/picking/pick.service';
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

      engine = new BABYLON.NullEngine();
      scene = new BABYLON.Scene(engine);
      // A real camera: the ray is built through scene.createPickingRay()
      const camera = new BABYLON.ArcRotateCamera(
        'camera', 0, Math.PI / 3, 10, BABYLON.Vector3.Zero(), scene);

      picking = jasmine.createSpyObj<PickService>(
        'PickService', ['pick', 'hover', 'clearHover', 'clearSelection', 'setSelected', 'bind']);

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
              animate: () => { }
            }
          },
          { provide: ViewCubeService, useValue: { pickSide: () => undefined, init: () => { } } },
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

    it('ignores a right-click, which pans the camera', () => {
      // The help table says the right button pans, and a pan that happens to end
      // where it began would otherwise select whatever was under the pointer.
      press(canvas(), { button: 2 });
      release(canvas(), { button: 2 });

      expect(picking.pick).not.toHaveBeenCalled();
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
  });

  // The section planes moved out with the sliders that drive them; what used to
  // be tested here is SceneViewService's now - see its spec.
});
