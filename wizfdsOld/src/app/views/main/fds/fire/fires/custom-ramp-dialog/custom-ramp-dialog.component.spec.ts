import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomRampDialogComponent } from './custom-ramp-dialog.component';

describe('CustomRampComponent', () => {
  let component: CustomRampDialogComponent;
  let fixture: ComponentFixture<CustomRampDialogComponent>;

  beforeEach(async(() => {
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
