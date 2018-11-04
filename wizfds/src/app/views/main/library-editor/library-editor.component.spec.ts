import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LibraryEditorComponent } from './library-editor.component';

describe('LibraryEditorComponent', () => {
  let component: LibraryEditorComponent;
  let fixture: ComponentFixture<LibraryEditorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LibraryEditorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LibraryEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
