import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { googleAnalyticsHeadScripts } from './assets/analytics';
import 'zone.js';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

// Set up google analytics
googleAnalyticsHeadScripts();

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));
