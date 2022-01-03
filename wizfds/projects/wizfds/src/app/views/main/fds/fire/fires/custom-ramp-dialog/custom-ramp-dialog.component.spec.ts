import { ComponentFixture, TestBed, waitForAsync as  } from '@angular/core/testing';

import { CustomRampDialogComponent } from './custom-ramp-dialog.component';

describe('CustomRampComponent', () => {
  let component: CustomRampDialogComponent;
  let fixture: ComponentFixture<CustomRampDialogComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ CustomRampDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CustomRampDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
