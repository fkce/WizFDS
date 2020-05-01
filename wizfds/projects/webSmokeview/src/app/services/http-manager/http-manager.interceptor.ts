import { tap } from 'rxjs/operators';
import { Injectable, isDevMode } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class HttpManagerInterceptor implements HttpInterceptor {

    constructor() { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const started = Date.now();


        return next
            .handle(req).pipe(
                tap(event => {
                    if (event instanceof HttpResponse) {
                        const elapsed = Date.now() - started;
                        if (isDevMode()) console.log(`Request for ${req.urlWithParams} took ${elapsed} ms.`);
                    }
                }));
    }
}