import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

export interface Result {
  meta: {
    status: string,
    from: string,
    details: string[]
  },
  data: any
}

@Injectable({
  providedIn: 'root'
})
export class HttpManagerService {

  constructor(
    private http: HttpClient
  ) { }

  /**
   * Http get request
   * @param apiURL Backed api url
   */
  public get(apiURL) {
    let promise = new Promise((resolve, reject) => {

  firstValueFrom(this.http.get(apiURL))
        .then(
          (result: Result) => { // Success
            if (isDevMode()) console.log(result);

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
    let promise = new Promise((resolve, reject) => {
      firstValueFrom(this.http.put(apiURL, object))
        .then(
          (result: Result) => { // Success

            if (isDevMode()) console.log(result);

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
    let promise = new Promise((resolve, reject) => {
      firstValueFrom(this.http.post(apiURL, object))
        .then(
          (result: Result) => { // Success

            if (isDevMode()) console.log(result);

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
    let promise = new Promise((resolve, reject) => {
      firstValueFrom(this.http.delete(apiURL))
        .then(
          (result: Result) => { // Success

            if (isDevMode()) console.log(result);

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
}
