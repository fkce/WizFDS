import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';

import { ResultsCatalogComponent } from './results-catalog.component';
import {
  ResultsCatalog, ResultsDirectoryService, ResultsStatus
} from '@services/results-directory/results-directory.service';

/**
 * The results catalog panel (#148).
 *
 * A listing and nothing more: what the run wrote, and which of it is still on
 * the disk. The folder, the picker and the permissions are the service's, so
 * it stands in here as a plain object - what is under test is what the panel
 * makes of the state it is handed.
 */
describe('ResultsCatalogComponent', () => {

  let fixture: ComponentFixture<ResultsCatalogComponent>;

  /** Two meshes of one quantity, one of which never made it to the disk. */
  function catalog(): ResultsCatalog {
    return {
      directoryName: 'demo',
      smvName: 'demo.smv',
      chid: 'demo',
      formats: [{
        kind: 'slcf',
        groups: [{
          label: 'TEMPERATURE, K=12',
          unit: 'C',
          files: [
            { filename: 'demo_1_1.sf', meshIndex: 1 } as any,
            { filename: 'demo_2_1.sf', meshIndex: 2 } as any
          ]
        }]
      }],
      availability: new Map([
        ['demo_1_1.sf', { size: 4096 }],
        ['demo_2_1.sf', null]
      ])
    };
  }

  /**
   * Build the panel over one state of the service. Configured per spec rather
   * than in a beforeEach: each of these is a different thing to have on screen.
   */
  function build(state: {
    status: ResultsStatus,
    message?: string,
    catalog?: ResultsCatalog,
    smvChoice?: readonly string[]
  }): { resume: jasmine.Spy, chooseSmv: jasmine.Spy } {
    const results = {
      status: state.status,
      message: state.message ?? '',
      catalog: state.catalog ?? null,
      smvChoice: state.smvChoice ?? [],
      name: 'demo',
      sizeOf: (file: any) => {
        const probed = (state.catalog?.availability ?? new Map()).get(file.filename);
        return probed ? probed.size : null;
      },
      isAbsent: (file: any) => {
        const availability = state.catalog?.availability ?? new Map();
        return availability.has(file.filename) && availability.get(file.filename) === null;
      },
      resume: jasmine.createSpy('resume'),
      chooseSmv: jasmine.createSpy('chooseSmv')
    };

    TestBed.configureTestingModule({
      imports: [MatIconModule],
      declarations: [ResultsCatalogComponent],
      providers: [{ provide: ResultsDirectoryService, useValue: results as any }]
    });

    fixture = TestBed.createComponent(ResultsCatalogComponent);
    fixture.detectChanges();
    return results;
  }

  /** The text of every row of one kind. */
  function rows(selector: string): string[] {
    return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll(selector))
      .map(row => row.textContent.replace(/\s+/g, ' ').trim());
  }

  /**
   * The same rows, cell by cell. The cells are laid out with a flex gap and
   * carry no whitespace between them, so their text has to be joined here.
   */
  function cells(selector: string): string[] {
    return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll(selector))
      .map(row => Array.from<HTMLElement>(row.querySelectorAll('span'))
        .map(cell => cell.textContent.trim())
        .filter(text => text.length > 0)
        .join(' '));
  }

  it('lists format, then quantity group, then one row per mesh', () => {
    build({ status: 'open', catalog: catalog() });

    expect(rows('.group-title')).toEqual(['Slices']);
    expect(cells('.row.quantity')).toEqual(['TEMPERATURE, K=12 C']);
    expect(cells('.row.file')).toEqual(['MESH 1 4.0 KB', 'MESH 2']);
    expect(fixture.nativeElement.querySelector('.palette-head .type').textContent)
      .toContain('demo');
  });

  it('marks the file the .smv named but the folder has not got', () => {
    // An interrupted run, or a copy that did not finish: the row stays, greyed,
    // because that it is missing is the information.
    build({ status: 'open', catalog: catalog() });

    const absent: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.row.file.absent'));
    expect(absent.length).toBe(1);
    expect(absent[0].textContent).toContain('MESH 2');
    expect(absent[0].querySelector('mat-icon.missing')).toBeTruthy();
  });

  it('offers to resume a folder whose permission has lapsed', () => {
    const results = build({ status: 'resumable', message: 'demo needs your permission again.' });

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.palette-empty button');
    expect(fixture.nativeElement.querySelector('.palette-empty').textContent)
      .toContain('needs your permission');
    button.click();

    expect(results.resume).toHaveBeenCalled();
  });

  it('shows what went wrong, with nothing to click', () => {
    build({ status: 'error', message: 'No .smv file in that folder.' });

    expect(fixture.nativeElement.querySelector('.palette-empty').textContent)
      .toContain('No .smv file');
    expect(fixture.nativeElement.querySelector('.palette-empty button')).toBeNull();
  });

  it('lists the cases to choose between, and passes the choice back', () => {
    // A choice of table of contents, not of results
    const results = build({ status: 'picking', smvChoice: ['a.smv', 'b.smv'] });

    expect(cells('.row.choice')).toEqual(['a.smv', 'b.smv']);
    (fixture.nativeElement.querySelectorAll('.row.choice')[1] as HTMLButtonElement).click();

    expect(results.chooseSmv).toHaveBeenCalledWith('b.smv');
  });

  describe('sizes', () => {
    it('reads a size the way a person does', () => {
      build({ status: 'closed' });
      const component = fixture.componentInstance;

      expect(component.formatSize(512)).toBe('512 B');
      expect(component.formatSize(4096)).toBe('4.0 KB');
      expect(component.formatSize(52 * 1024 * 1024)).toBe('52 MB');
      // 1023.9 KB is not a size anybody writes down
      expect(component.formatSize(1048500)).toBe('1.0 MB');
    });
  });
});
