import { Component, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { NgxCookieBannerComponent } from 'ngx-cookie-banner';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit, OnDestroy {
  title = 'app';
  @ViewChild('cookie')
  banner: NgxCookieBannerComponent;

  private _cookieSub: Subscription;

  // It is currently necessary to manually subscribe at this
  // point to initialize the banner component.
  ngAfterViewInit() {
    this._cookieSub = this.banner.isSeen.subscribe();
  }

  ngOnDestroy() {
    this._cookieSub.unsubscribe();
  }
}
