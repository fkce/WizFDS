import { ComponentFixture, TestBed, waitForAsync as  } from '@angular/core/testing';

import { ObstructionComponent } from './obstruction.component';

describe('ObstructionComponent', () => {
  let component: ObstructionComponent;
  let fixture: ComponentFixture<ObstructionComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ObstructionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObstructionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
