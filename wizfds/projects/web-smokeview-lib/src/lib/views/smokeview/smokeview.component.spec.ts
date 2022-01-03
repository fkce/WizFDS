import { ComponentFixture, TestBed, waitForAsync as  } from '@angular/core/testing';

import { SmokeviewComponent } from './smokeview.component';

describe('SmokeviewComponent', () => {
  let component: SmokeviewComponent;
  let fixture: ComponentFixture<SmokeviewComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ SmokeviewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SmokeviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
