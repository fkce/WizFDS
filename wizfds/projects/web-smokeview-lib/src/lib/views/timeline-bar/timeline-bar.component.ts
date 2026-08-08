import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit
} from '@angular/core';
import { Subscription } from 'rxjs';
import * as BABYLON from 'babylonjs';

import { BabylonService } from '../../services/babylon/babylon.service';
import { RATE_LADDER, TimelineService } from '../../services/timeline/timeline.service';

/**
 * The playback bar of the results timeline ("Oś czasu", CONTEXT.md): play,
 * a slider over the whole run in simulation seconds, the readout and the rate.
 *
 * It sits in the library rather than in either host because there is nothing
 * here for a host to decide - see the 2026-08-07 addendum to ADR-0010, which
 * moves that boundary from "overlays belonging to a gesture" to "presentation
 * in which the host has nothing to decide". Both consumers get the same bar,
 * and it is deliberately not part of the results catalog panel: that panel is
 * closable, and closing it must not take away control of what is still drawn.
 *
 * The bar is also where the clock is wound. The render loop runs outside the
 * Angular zone (BabylonService.animate), so the tick advances the timeline and
 * then checks this component alone: re-entering the zone would make the whole
 * host application prove it had not changed, sixty times a second, to move one
 * slider.
 */
@Component({
  selector: 'lib-timeline-bar',
  templateUrl: './timeline-bar.component.html',
  styleUrls: ['./timeline-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class TimelineBarComponent implements OnInit, OnDestroy {

  public readonly rates = RATE_LADDER;

  private sceneSub: Subscription | null = null;
  private scene: BABYLON.Scene | null = null;
  private observer: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null;
  private destroyed = false;

  /** What the handle was last dragged to - see sliderValue. */
  private scrubbed = 0;

  constructor(
    public timeline: TimelineService,
    private babylonService: BabylonService,
    private changeDetector: ChangeDetectorRef
  ) { }

  public ngOnInit(): void {
    this.sceneSub = this.babylonService.scene$.subscribe(scene => this.attach(scene));
  }

  public ngOnDestroy(): void {
    this.destroyed = true;
    this.detach();
    this.sceneSub?.unsubscribe();
  }

  /** `12.4 / 300.0 s` - tenths, because frames are rarely closer than that. */
  public get readout(): string {
    return `${this.timeline.time.toFixed(1)} / ${this.timeline.end.toFixed(1)} s`;
  }

  /**
   * Where the handle sits.
   *
   * While it is held it answers with what the pointer last made of it, so that
   * the tick's change detection cannot write a value back underneath the drag.
   */
  public get sliderValue(): number {
    return this.timeline.grabbed ? this.scrubbed : this.timeline.time;
  }

  public onGrab(): void {
    this.scrubbed = this.timeline.time;
    this.timeline.grab();
  }

  public onScrub(event: Event): void {
    this.scrubbed = Number((event.target as HTMLInputElement).value);
    this.timeline.seek(this.scrubbed);
  }

  public onRelease(): void {
    this.timeline.release();
  }

  public onRateChange(event: Event): void {
    this.timeline.setRate(Number((event.target as HTMLSelectElement).value));
  }

  private attach(scene: BABYLON.Scene | null): void {
    this.detach();
    if (!scene) { return; }

    this.scene = scene;
    this.observer = scene.onBeforeRenderObservable.add(() => this.tick());
  }

  private detach(): void {
    if (this.scene && this.observer) {
      this.scene.onBeforeRenderObservable.remove(this.observer);
    }
    this.scene = null;
    this.observer = null;
  }

  /**
   * One frame: move the clock by the frame's own delta, then repaint the bar.
   *
   * Nothing else in the application is checked - this component is OnPush and
   * is asked directly. The view can be gone while the loop is still unwinding,
   * so the guard is not decorative.
   */
  private tick(): void {
    if (this.destroyed) { return; }

    const engine = this.babylonService.engine;
    this.timeline.advance(engine ? engine.getDeltaTime() : 0);
    this.changeDetector.detectChanges();
  }
}
