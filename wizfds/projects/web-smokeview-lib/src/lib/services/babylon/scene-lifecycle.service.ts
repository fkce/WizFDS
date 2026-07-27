import { Injectable, isDevMode } from '@angular/core';

/**
 * A service holding state that belongs to one scene and must not outlive it.
 *
 * The drawing services are `providedIn: 'root'`, so they live as long as the
 * application while the scene they hold meshes and materials for is created and
 * disposed with the view. Implementing this is how a service gets told the
 * scene has gone.
 */
export interface SceneScoped {
  /**
   * Drop every reference tied to the scene that has just been disposed.
   *
   * The meshes and materials themselves are gone already - disposing the scene
   * took them. This is about not holding on to the corpses.
   */
  resetSceneState(): void;
}

/**
 * Registry of everything that has to be reset when a scene goes away.
 *
 * Participants register themselves; nothing here knows what they are. That
 * keeps the dependency pointing one way - a drawing service may depend on this,
 * never the reverse - and means adding a new drawing service is one line in its
 * constructor rather than an edit here.
 */
@Injectable({
  providedIn: 'root'
})
export class SceneLifecycleService {

  private readonly participants = new Set<SceneScoped>();

  public register(participant: SceneScoped): void {
    this.participants.add(participant);
  }

  /**
   * Tell every participant its scene is gone.
   *
   * One participant throwing does not strand the rest: the scene is already
   * disposed either way, and a half-reset library is worse than a logged error.
   */
  public reset(): void {
    this.participants.forEach(participant => {
      try {
        participant.resetSceneState();
      } catch (e) {
        if (isDevMode()) console.error('[SceneLifecycleService] A participant failed to reset', e);
      }
    });
  }
}
