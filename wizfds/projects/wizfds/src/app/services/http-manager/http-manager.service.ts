import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Main } from '../main/main';
import { MainService } from '../main/main.service';

export interface Result {
  meta: {
    status: string,
    from: string,
    details: string[]
  },
  data: object
}

@Injectable()
export class HttpManagerService {

  private _progress: boolean;

  constructor(
    private http: HttpClient
  ) {
    this.progress = false;
  }

  /**
   * Http get request
   * @param apiURL Backed api url
   */
  public get(apiURL) {
    this.progress = true;
    let promise = new Promise((resolve, reject) => {
      this.http.get(apiURL)
        .toPromise()
        .then(
          (result: Result) => { // Success

            if (isDevMode()) console.log(result);
            if (result.meta.from != 'getSettings()')
              this.progress = false;

            if (result.meta.status == 'success') {
              resolve(result);
            } else if (result.meta.status == 'info') {
              resolve(result);
            } else if (result.meta.status == 'warning') {
              reject(result);
            } else if (result.meta.status == 'error') {
              reject(result);
            } else {
              reject(result);
            }
          },
          error => { // Error
            reject(error);
          }
        );
    });
    return promise;
  }

  /**
   * Put api
   * @param apiURL 
   * @param object 
   */
  public put(apiURL: string, object: any) {
    this.progress = true;
    let promise = new Promise((resolve, reject) => {
      this.http.put(apiURL, object)
        .toPromise()
        .then(
          (result: Result) => { // Success

            if (isDevMode()) console.log(result);
            this.progress = false;

            if (result.meta.status == 'success') {
              if (isDevMode()) console.log('Notification success');
              resolve(result);
            } else if (result.meta.status == 'info') {
              if (isDevMode()) console.log('Notification info');
              resolve(result);
            } else if (result.meta.status == 'warning') {
              if (isDevMode()) console.log('Notification warning');
              reject(result);
            } else if (result.meta.status == 'error') {
              if (isDevMode()) console.log('Notification error');
              reject(result);
            } else {
              reject(result);
            }
            if (isDevMode()) console.log(result);

          },
          error => { // Error
            reject(error);
          }
        );
    });
    return promise;
  }

  /**
   * Post api
   * @param apiURL 
   * @param object 
   */
  public post(apiURL: string, object: any) {
    this.progress = true;
    let promise = new Promise((resolve, reject) => {
      this.http.post(apiURL, object)
        .toPromise()
        .then(
          (result: Result) => { // Success

            if (isDevMode()) console.log(result);
            this.progress = false;

            if (result.meta.status == 'success') {
              if (isDevMode()) console.log('Notification success');
              resolve(result);
            } else if (result.meta.status == 'info') {
              if (isDevMode()) console.log('Notification info');
              resolve(result);
            } else if (result.meta.status == 'warning') {
              if (isDevMode()) console.log('Notification warning');
              reject(result);
            } else if (result.meta.status == 'error') {
              if (isDevMode()) console.log('Notification error');
              reject(result);
            } else {
              reject(result);
            }
            if (isDevMode()) console.log(result);

          },
          error => { // Error
            reject(error);
          }
        );
    });
    return promise;
  }

  /**
   * Delete api
   * @param apiURL 
   * @param object 
   */
  public delete(apiURL: string) {
    this.progress = true;
    let promise = new Promise((resolve, reject) => {
      this.http.delete(apiURL)
        .toPromise()
        .then(
          (result: Result) => { // Success

            if (isDevMode()) console.log(result);
            this.progress = false;

            if (result.meta.status == 'success') {
              if (isDevMode()) console.log('Notification success');
              resolve(result);
            } else if (result.meta.status == 'info') {
              if (isDevMode()) console.log('Notification info');
              resolve(result);
            } else if (result.meta.status == 'warning') {
              if (isDevMode()) console.log('Notification warning');
              reject(result);
            } else if (result.meta.status == 'error') {
              if (isDevMode()) console.log('Notification error');
              reject(result);
            } else {
              reject(result);
            }
            if (isDevMode()) console.log(result);

          },
          error => { // Error
            reject(error);
          }
        );
    });
    return promise;
  }

  /**
   * Getter progress
   * @return {boolean}
   */
  public get progress(): boolean {
    return this._progress;
  }

  /**
   * Setter progress
   * @param {boolean} value
   */
  public set progress(value: boolean) {
    this._progress = value;
  }

}