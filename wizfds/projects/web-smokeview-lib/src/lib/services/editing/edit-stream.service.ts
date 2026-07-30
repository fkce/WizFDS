import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { SceneEditCommand } from './edit-command';

/**
 * What the user asked to change in the scene, on its way out of the library.
 *
 * The counterpart of `scene$`: state comes in, intent goes out (ADR-0004). A
 * tool - the gizmo of #124, the draw commands of #125 - calls `emit()` when its
 * gesture ends, and whoever owns the scenario applies it. The library keeps no
 * record of what it emitted: a command it sends is a request, and what became of
 * it comes back as new state to draw.
 *
 * Not replayed. A command is a moment, and a subscriber that arrives afterwards
 * would apply an edit the user made before it was listening - a second time, on
 * top of a scenario that already has it.
 *
 * The standalone viewer has no `Fds` to apply anything to, so nothing subscribes
 * there and nothing is emitted: it draws a finished simulation and has no tools.
 */
@Injectable({
  providedIn: 'root'
})
export class EditStreamService {

  private readonly commandSubject = new Subject<SceneEditCommand>();

  /** Edits the user made in the scene, in the order they made them. */
  public readonly commands$: Observable<SceneEditCommand> = this.commandSubject.asObservable();

  /**
   * Ask for one edit.
   *
   * Once per gesture, not once per frame: the preview of a drag is drawn locally
   * as presentational state, and this is called when the pointer comes up.
   */
  public emit(command: SceneEditCommand): void {
    this.commandSubject.next(command);
  }
}
