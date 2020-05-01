import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';

import { AppComponent } from './app.component';
import { FrontComponent } from './view/front/front.component';
import { NgxCookieBannerModule } from 'ngx-cookie-banner';
import { RouterModule } from '@angular/router';

// WebSmokeviewLib
import { SmokeviewModule } from '../../../web-smokeview-lib/src/lib/views/smokeview/smokeview.module';
import { SmokeviewApiModule } from '../../../web-smokeview-lib/src/lib/services/smokeview-api/smokeview-api.module';

@NgModule({
  declarations: [
    AppComponent,
    FrontComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    NgxCookieBannerModule.forRoot({
      cookieName: 'WizFDS'
    }),
    RouterModule,
    SmokeviewModule,
    SmokeviewApiModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
