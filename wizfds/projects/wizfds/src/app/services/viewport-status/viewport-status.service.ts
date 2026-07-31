import { Injectable } from '@angular/core';

/** Where the pointer is in the model, in FDS metres (ADR-0002). */
export interface ViewportCursor {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** The &MESH the pointer falls in, and how fine its grid is - in metres. */
export interface ViewportGrid {
  readonly id: string;
  readonly cell: { readonly i: number, readonly j: number, readonly k: number };
}

/**
 * What the status bar says while the pointer is over the 3D view.
 *
 * The instrument status bar belongs to the whole app (`app.component.html`), and
 * the 3D view is one route within it, so the two cannot talk directly. This is
 * what stands between them: the view writes, the bar reads, and both stop at the
 * same nulls when there is nothing to say.
 *
 * Both segments are handed over rather than worked out here. The grid used to
 * be: this service found the first &MESH containing the point. But the grid on
 * the bar has to be the one an edit will actually round to, and that rule -
 * the finer of two overlapping meshes, the nearest one outside them all - lives
 * where the snapping does (#124). Two implementations of "the active mesh"
 * would eventually disagree, and the one the user reads would not be the one
 * their edit obeyed.
 */
@Injectable({
  providedIn: 'root'
})
export class ViewportStatusService {

  /**
   * Whether the 3D view is open at all.
   *
   * What the status bar shows its two segments on, rather than on the cursor
   * itself: the pointer crosses empty space constantly, and a segment that came
   * and went with it would reflow the whole row several times a second. Absent
   * outside the view, present and dashed inside it.
   */
  public active = false;

  /** Where the pointer last met the model. Null when it is over nothing. */
  public cursor: ViewportCursor | null = null;

  /**
   * The grid a snap would round to at the cursor. Null with no cursor, and in
   * a scenario that has no &MESH at all.
   */
  public grid: ViewportGrid | null = null;

  /** The 3D view has been opened, and is about to start reporting. */
  public enter(): void {
    this.active = true;
  }

  /**
   * Say where the pointer is and which grid is in force there, or that it is
   * nowhere.
   *
   * Held as plain fields rather than published as a stream: the status bar reads
   * them from a template on a change detection pass that the pointer event has
   * already caused, and a stream would only add a subscription per reader.
   */
  public setCursor(point: ViewportCursor | null, grid: ViewportGrid | null = null): void {
    if (!point) {
      this.cursor = null;
      this.grid = null;
      return;
    }

    this.cursor = { x: point.x, y: point.y, z: point.z };
    this.grid = grid;
  }

  /**
   * Take the readout down - the user has left the 3D view.
   *
   * Otherwise the last coordinate the pointer touched sits in the status bar
   * while they edit a form.
   */
  public leave(): void {
    this.active = false;
    this.cursor = null;
    this.grid = null;
  }

}
