import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StepsDialogComponent } from './steps-dialog.component';

describe('StepsDialogComponent', () => {
  let component: StepsDialogComponent;
  let fixture: ComponentFixture<StepsDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StepsDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StepsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
