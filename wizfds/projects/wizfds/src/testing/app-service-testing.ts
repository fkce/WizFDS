import { EnvironmentProviders, Provider } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { MainService } from '@services/main/main.service';
import { HttpManagerService } from '@services/http-manager/http-manager.service';
import { LibraryService } from '@services/library/library.service';
import { UiStateService } from '@services/ui-state/ui-state.service';
import { CadService } from '@services/cad/cad.service';
import { IdGeneratorService } from '@services/id-generator/id-generator.service';

/**
 * Everything the app's services need to be constructed in a test.
 *
 * They are wired to each other rather than mocked: these specs assert that the
 * dependency graph is satisfiable, which a mock would hide. Only the outside
 * world - HTTP, router, animations - is stubbed.
 *
 * MainService fetches settings from its constructor; provideHttpClientTesting()
 * intercepts that request, so nothing leaves the browser.
 */
export function appServiceProviders(): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(),
    provideHttpClientTesting(),
    provideRouter([]),
    provideNoopAnimations(),
    MainService,
    HttpManagerService,
    LibraryService,
    UiStateService,
    CadService,
    IdGeneratorService
  ];
}
