import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SmokeviewComponent } from './smokeview.component';

describe('SmokeviewComponent', () => {
  let component: SmokeviewComponent;
  let fixture: ComponentFixture<SmokeviewComponent>;

  beforeEach(async(() => {
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
