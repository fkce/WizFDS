import { ComponentFixture, TestBed, waitForAsync as  } from '@angular/core/testing';

import { StepsDialogComponent } from './steps-dialog.component';

describe('StepsDialogComponent', () => {
  let component: StepsDialogComponent;
  let fixture: ComponentFixture<StepsDialogComponent>;

  beforeEach(waitForAsync(() => {
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
