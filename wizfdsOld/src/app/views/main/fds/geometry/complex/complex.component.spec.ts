import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ComplexComponent } from './complex.component';

describe('ComplexComponent', () => {
  let component: ComplexComponent;
  let fixture: ComponentFixture<ComplexComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ComplexComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ComplexComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
