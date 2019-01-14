import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MainComponent } from './view/main/main.component';
import { FrontComponent } from './view/front/front.component';
import { ScrollToModule } from '@nicky-lenaers/ngx-scroll-to';
import { CookieLawModule } from 'angular2-cookie-law';

@NgModule({
  declarations: [
    AppComponent,
    MainComponent,
    FrontComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ScrollToModule.forRoot(),
    BrowserAnimationsModule,
    CookieLawModule 
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
