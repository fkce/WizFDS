import { Injectable, isDevMode } from '@angular/core';
import { BehaviorSubject ,  Observable ,  of } from 'rxjs';

import { Result, HttpManagerService } from '@services/http-manager/http-manager.service';
import { MainService } from '@services/main/main.service';
import { Main } from '@services/main/main';
import { Library } from './library';
import { SnackBarService } from '@services/snack-bar/snack-bar.service';

@Injectable()
export class LibraryService {

  main: Main;
  library: Library = new Library(JSON.stringify('{}'));
  librarySubject = new BehaviorSubject<Library>(this.library);
  libraryObservable = this.librarySubject.asObservable();

  constructor(
    private mainService: MainService,
    private httpManager: HttpManagerService,
    private snackBarService: SnackBarService
  ) {
    this.mainService.getMain().subscribe(main => this.main = main);
  }

  /** Get library */
  public getLibrary(): Observable<Library> {
    return of(this.library);
  }

  /**
   * Set new library and announce to subscribers
   * @param lib Library json string
   */
  public setLibrary(lib: string) {
    this.library = new Library(lib);
    this.librarySubject.next(this.library);
  }

  /** Get library from database */
  public loadLibrary() {
    this.httpManager.get(this.main.settings.hostAddress + '/api/library').then((result: Result) => {
      this.setLibrary(JSON.stringify(result.data));
      this.snackBarService.notify(result.meta.status, result.meta.details[0]);
    });
  }

  /** Update library in database */
  updateLibrary(quiet: boolean = false) {
    this.httpManager.put(this.main.settings.hostAddress+ '/api/library', JSON.stringify(this.library.toJSON())).then((result: Result) => {
      if(result.meta.status == 'success') {
        clearTimeout(this.main.autoSave.libTimeout);
        this.main.autoSave.libSaveFont = 'mdi mdi-content-save green';
      }
      if(!quiet) {
        this.snackBarService.notify(result.meta.status, result.meta.details[0]);
      }
    });
  }

}
