import { Injectable, isDevMode } from '@angular/core';
import { BehaviorSubject ,  Observable ,  of } from 'rxjs';
import { NotifierService } from 'angular-notifier';

import { Result, HttpManagerService } from '@services/http-manager/http-manager.service';
import { MainService } from '@services/main/main.service';
import { Main } from '@services/main/main';
import { Library } from './library';

@Injectable()
export class LibraryService {

  main: Main;
  library: Library = new Library(JSON.stringify('{}'));
  librarySubject = new BehaviorSubject<Library>(this.library);
  libraryObservable = this.librarySubject.asObservable();

  constructor(
    private mainService: MainService,
    private httpManager: HttpManagerService,
    private readonly notifierService: NotifierService
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
      this.notifierService.notify(result.meta.status, result.meta.details[0]);
    });
  }

  /** Update library in database */
  updateLibrary() {
    this.httpManager.put(this.main.settings.hostAddress+ '/api/library', JSON.stringify(this.library.toJSON())).then((result: Result) => {
      this.notifierService.notify(result.meta.status, result.meta.details[0]);
    });
  }

}
