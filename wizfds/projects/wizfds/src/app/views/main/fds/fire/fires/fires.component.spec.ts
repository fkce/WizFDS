import { ComponentFixture, TestBed, waitForAsync as  } from '@angular/core/testing';

import { FiresComponent } from './fires.component';

describe('FiresComponent', () => {
  let component: FiresComponent;
  let fixture: ComponentFixture<FiresComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ FiresComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FiresComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
