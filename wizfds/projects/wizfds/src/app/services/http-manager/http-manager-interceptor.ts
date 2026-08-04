import { tap } from 'rxjs/operators';
import { Injectable, isDevMode } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class HttpManagerInterceptor implements HttpInterceptor {

  constructor() { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const started = Date.now();

    // The backend rejects writes that arrive without this header: a browser will
    // not attach it to a cross-site request without a CORS preflight, which the
    // server never approves, so a forged request cannot reach the API even with
    // the session cookie along for the ride.
    const request = req.clone({ setHeaders: { 'X-Requested-With': 'XMLHttpRequest' } });

    return next
      .handle(request).pipe(
        tap(event => {
          if (event instanceof HttpResponse) {
            const elapsed = Date.now() - started;
            if (isDevMode()) console.log(`Request for ${req.urlWithParams} took ${elapsed} ms.`);
          }
        }));
  }

}
