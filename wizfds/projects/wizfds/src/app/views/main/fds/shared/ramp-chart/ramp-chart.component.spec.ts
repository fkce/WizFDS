import { ComponentFixture, TestBed, waitForAsync as  } from '@angular/core/testing';

import { RampChartComponent } from './ramp-chart.component';

describe('RampChartComponent', () => {
  let component: RampChartComponent;
  let fixture: ComponentFixture<RampChartComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ RampChartComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RampChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
