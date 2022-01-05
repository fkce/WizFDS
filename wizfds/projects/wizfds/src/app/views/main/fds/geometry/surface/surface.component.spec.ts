import { ComponentFixture, TestBed, waitForAsync as  } from '@angular/core/testing';

import { SurfaceComponent } from './surface.component';

describe('SurfaceComponent', () => {
  let component: SurfaceComponent;
  let fixture: ComponentFixture<SurfaceComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ SurfaceComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SurfaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
