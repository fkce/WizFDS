import { Component } from '@angular/core';

import {
  displaySwitchIcon, layerStateIcon, SceneDisplayId, SceneLayerId, SceneViewService
} from '../../../web-smokeview-lib/src/lib/services/scene-view/scene-view.service';
import { SceneAxis } from '../../../web-smokeview-lib/src/lib/services/scene-bounds/scene-bounds.service';

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

  /**
   * The icons the switches read as.
   *
   * The mapping is the library's, so this bar and the main app's ribbon say the
   * same thing with the same picture.
   */
  layerIcon(id: SceneLayerId): string {
    return layerStateIcon(this.view.layerState(id));
  }

  displayIcon(id: SceneDisplayId): string {
    return displaySwitchIcon(this.view.isDisplayOn(id));
  }
}
