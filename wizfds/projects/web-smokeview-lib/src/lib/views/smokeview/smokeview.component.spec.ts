import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ReplaySubject } from 'rxjs';

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
      ready$: new ReplaySubject<void>(1),
      createScene: () => Promise.resolve(),
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
          ready$: new ReplaySubject<void>(1),
          createScene,
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
});
