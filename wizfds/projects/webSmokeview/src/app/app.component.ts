import { Component } from '@angular/core';

import { SceneViewService } from '../../../web-smokeview-lib/src/lib/services/scene-view/scene-view.service';
import { SceneAxis } from '../../../web-smokeview-lib/src/lib/services/scene-bounds/scene-bounds.service';
import { SceneDisplayId, SceneLayerId } from '../../../web-smokeview-lib/src/lib/services/scene-view/scene-view.service';

/**
 * The standalone viewer's shell.
 *
 * It carries a control bar of its own because the controls left the library
 * (ADR-0010) and this app has no ribbon to put them in - and never will, since
 * it has no `Fds` and is not an editor. Built on the same design tokens as the
 * main app, so the two look like one product.
 */
@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: false
})
export class AppComponent {
  title = 'webSmokeview';

  readonly axes: readonly SceneAxis[] = ['x', 'y', 'z'];

  constructor(public view: SceneViewService) { }

  /** The icon that says how much of a layer is drawn. */
  layerIcon(id: SceneLayerId): string {
    const state = this.view.layerState(id);
    return state === 'hidden' ? 'eye-off-outline'
      : state === 'edges' ? 'square-outline' : 'checkbox-blank';
  }

  displayIcon(id: SceneDisplayId): string {
    return this.view.isDisplayOn(id) ? 'checkbox-marked-outline' : 'checkbox-blank-outline';
  }
}
