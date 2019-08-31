import { Injectable, isDevMode } from '@angular/core';
import { BehaviorSubject, Observable, of, timer } from 'rxjs';
import { Main } from './main';
import { HttpManagerService, Result } from '@services/http-manager/http-manager.service';
import { each } from 'lodash';
import { SnackBarService } from '@services/snack-bar/snack-bar.service';

@Injectable()
export class MainService {

  // This is the main object including all current data
  main: Main = new Main(JSON.stringify({}));
  mainSubject = new BehaviorSubject<Main>(this.main);

  constructor(
    private httpManager: HttpManagerService,
    private snackBarService: SnackBarService
  ) {
    this.getSettings();
  }

  public getMain(): Observable<Main> {
    //return of(this.main);
    return this.mainSubject.asObservable();
  }

  /**
   * Get user settings from database
   * table users
   */
  public getSettings() {
    this.httpManager.get(this.main.settings.hostAddress + '/api/settings').then((result: Result) => {
      let main = new Main(JSON.stringify(result.data));
      this.main.userId = main.userId;
      this.main.settings.userName = main.settings.userName;
      this.main.settings.email = main.settings.email;
      this.main.settings.hostAddress = main.settings.hostAddress;
      this.main.settings.tooltips = main.settings.tooltips;
      this.main.settings.editor = main.settings.editor;
      this.main.idle.timeout = main.idle.timeout;
      this.main.websocket.host = main.websocket.host;
      this.main.websocket.port = main.websocket.port;
      this.snackBarService.notify(result.meta.status, result.meta.details[0]);
    });
  }

  public updateSettings() {
    this.httpManager.put(this.main.settings.hostAddress + '/api/settings/' + this.main.userId, this.main.toJSON()).then((result: Result) => {
      this.snackBarService.notify(result.meta.status, result.meta.details[0]);
      this.resetIdle();
    });
  }

  /**
   * Reset idle
   */
  public resetIdle() {
      this.main.idle.subscription.unsubscribe();
      this.main.idle.interval = 60000;
      this.main.idle.timeout = 3600;
      this.main.idle.showWarning = false;
      this.subscribeIdle();
  }

  public subscribeIdle() {
    this.main.idle.timer = timer(this.main.idle.interval, this.main.idle.interval);
    this.main.idle.subscription = this.main.idle.timer.subscribe((val) => {
        this.updateIdle();
    });
  }

  public updateIdle() {
    this.main.idle.timeout = this.main.idle.timeout - this.main.idle.interval / 1000;
    if(isDevMode()) {
      console.log(this.main.idle.timeout);
    }

    if (this.main.idle.timeout <= 600 && !this.main.idle.showWarning) {
      this.main.idle.subscription.unsubscribe();
      this.main.idle.interval = 1000;
      this.main.idle.showWarning = true;
      this.subscribeIdle();
    }
    else if (this.main.idle.timeout <= 0) {
      this.main.idle.subscription.unsubscribe();
      window.location.href = 'https://wizfds.com/logout';
    }
  }

  /** 
   * Get max id from list 
  */
  public getListId(list: any[], type?: string): number {
    if (list.length > 0) {

      let maxId = 0;
      let id: number;

      // Check max Id of existing elements
      each(list, function (element) {
        if (element['id'] != "") {
          if (type == 'jetfan') {
            id = Number(element['id'].toString().substr(6));
          }
          else {
            id = Number(element['id'].toString().substr(4));
          }

          if (id > maxId) {
            maxId = id;
          }
        }
      });
      maxId++;
      return maxId;
    }
    else return 1;
  }

}