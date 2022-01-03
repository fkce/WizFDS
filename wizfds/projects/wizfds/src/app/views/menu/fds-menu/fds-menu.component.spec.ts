import { ComponentFixture, TestBed, waitForAsync as  } from '@angular/core/testing';

import { FdsMenuComponent } from './fds-menu.component';

describe('FdsMenuComponent', () => {
  let component: FdsMenuComponent;
  let fixture: ComponentFixture<FdsMenuComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ FdsMenuComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FdsMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
