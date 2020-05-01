import { BrowserModule, DomSanitizer } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { MatIconRegistry, MatIconModule } from '@angular/material/icon';

import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { HttpManagerService } from './services/http-manager/http-manager.service';
import { HttpManagerInterceptor } from './services/http-manager/http-manager.interceptor';

// WebSmokeviewLib
import { SmokeviewModule } from '../../../web-smokeview-lib/src/lib/views/smokeview/smokeview.module';
import { SmokeviewApiModule } from '../../../web-smokeview-lib/src/lib/services/smokeview-api/smokeview-api.module';
import { TreeComponent } from './views/tree/tree.component';


@NgModule({
  declarations: [
    AppComponent,
    TreeComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    SmokeviewModule,
    SmokeviewApiModule
  ],
  providers: [
    HttpManagerService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpManagerInterceptor,
      multi: true,
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(matIconRegistry: MatIconRegistry, domSanitizer: DomSanitizer) {
    matIconRegistry.addSvgIconSet(domSanitizer.bypassSecurityTrustResourceUrl('./assets/mdi.svg'));
  }
}
