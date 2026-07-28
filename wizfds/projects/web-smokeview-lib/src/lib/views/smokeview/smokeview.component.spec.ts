import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { BehaviorSubject } from 'rxjs';

import { BabylonService } from '../../services/babylon/babylon.service';
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
    expect(fixture.nativeElement.querySelector('.menu')).toBeNull();
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

  it('keeps the controls when WebGPU is available', async () => {
    await configure(true);

    expect(fixture.nativeElement.querySelector('.unsupported')).toBeNull();
    expect(fixture.nativeElement.querySelector('.menu')).toBeTruthy();
  });

  describe('setClip', () => {
    // One slider, one plane, but every drawing service owns its own materials -
    // so each of them has to be told, and a service left out keeps drawing
    // through a plane the user has dragged past it.

    it('moves the plane on every element type it cuts', async () => {
      await configure(true);

      const obst = spyOn(component.obstService, 'clip');
      const fire = spyOn(component.fireService, 'clip');
      const vent = spyOn(component.ventService, 'clipBasic');
      const open = spyOn(component.openService, 'clip');

      component.setClip('x', 3.5);

      expect(obst).toHaveBeenCalledWith(3.5, 'x');
      expect(fire).toHaveBeenCalledWith(3.5, 'x');
      expect(vent).toHaveBeenCalledWith(3.5, 'x');
      expect(open)
        .withContext('openings used to be drawn with no clipping at all')
        .toHaveBeenCalledWith(3.5, 'x');
    });
  });
});
