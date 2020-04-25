import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ParabolaChartComponent } from './parabola-chart.component';

describe('ParabolaChartComponent', () => {
  let component: ParabolaChartComponent;
  let fixture: ComponentFixture<ParabolaChartComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ParabolaChartComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ParabolaChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
