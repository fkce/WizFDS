import { ComponentFixture, TestBed, waitForAsync as  } from '@angular/core/testing';

import { VisualizeComponent } from './visualize.component';

describe('VisualizeComponent', () => {
  let component: VisualizeComponent;
  let fixture: ComponentFixture<VisualizeComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ VisualizeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisualizeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
