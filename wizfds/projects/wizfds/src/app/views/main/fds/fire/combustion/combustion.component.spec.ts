import { ComponentFixture, TestBed, waitForAsync as  } from '@angular/core/testing';

import { CombustionComponent } from './combustion.component';

describe('CombustionComponent', () => {
  let component: CombustionComponent;
  let fixture: ComponentFixture<CombustionComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ CombustionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CombustionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
