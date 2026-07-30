import { Injectable } from '@angular/core';
import { find } from 'lodash';

import { ElementsService } from '@services/elements/elements.service';

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
 * Which &MESH a point falls in is a question about the scenario, not about the
 * scene - so the library reports a coordinate and this answers the rest
 * (ADR-0010). It is also what a snap will round to once #124 exists, which is
 * why the cell size is here and not only the name.
 */
@Injectable({
  providedIn: 'root'
})
export class ViewportStatusService {

  /** Where the pointer last met the model. Null when it is over nothing. */
  public cursor: ViewportCursor | null = null;

  /** The grid under the cursor. Null outside every &MESH, and with no cursor. */
  public grid: ViewportGrid | null = null;

  constructor(private elementsService: ElementsService) { }

  /**
   * Say where the pointer is, or that it is nowhere.
   *
   * Held as plain fields rather than published as a stream: the status bar reads
   * them from a template on a change detection pass that the pointer event has
   * already caused, and a stream would only add a subscription per reader.
   */
  public setCursor(point: ViewportCursor | null): void {
    if (!point) {
      this.clear();
      return;
    }

    this.cursor = { x: point.x, y: point.y, z: point.z };
    this.grid = this.gridAt(point);
  }

  /** Take the readout down - the user has left the 3D view. */
  public clear(): void {
    this.cursor = null;
    this.grid = null;
  }

  /**
   * The grid of the &MESH this point is in.
   *
   * The first of them, where several qualify: meshes share their boundary faces
   * by construction, so a point on one belongs to both, and answering with
   * whichever comes first keeps the readout from flickering as the pointer sits
   * still on a face.
   */
  private gridAt(point: ViewportCursor): ViewportGrid | null {
    const mesh = find(this.elementsService.listOf('mesh'),
      (candidate) => !!candidate && contains(candidate.xb, point));

    if (!mesh) { return null; }

    return {
      id: mesh.id,
      cell: { i: mesh.isize, j: mesh.jsize, k: mesh.ksize }
    };
  }
}

/** Whether a box holds a point, faces included. */
function contains(xb: any, point: ViewportCursor): boolean {
  if (!xb) { return false; }
  return point.x >= xb.x1 && point.x <= xb.x2
    && point.y >= xb.y1 && point.y <= xb.y2
    && point.z >= xb.z1 && point.z <= xb.z2;
}
