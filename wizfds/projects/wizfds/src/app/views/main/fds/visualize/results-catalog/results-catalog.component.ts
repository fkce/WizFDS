import { Component } from '@angular/core';

import { ResultsCatalog, ResultsDirectoryService } from '@services/results-directory/results-directory.service';
import {
  SmvResultFile, SmvResultKind
} from '../../../../../../../../web-smokeview-lib/src/lib/services/parsers/smv/smv-file';

/**
 * How this app words the result formats, and which icon it gives them.
 *
 * Wording and pixels belong to the host, the grouping behind them to the
 * library (ADR-0010) - which is why these sit here rather than next to
 * `groupResults()`, and why the standalone viewer keeps its own copy.
 */
const FORMAT_LABELS: Readonly<Record<SmvResultKind, string>> = {
  slcf: 'Slices',
  bndf: 'Boundaries',
  prt5: 'Particles',
  smoke3d: 'Smoke',
  isof: 'Isosurfaces'
};

const FORMAT_ICONS: Readonly<Record<SmvResultKind, string>> = {
  slcf: 'layers-outline',
  bndf: 'border-all-variant',
  prt5: 'scatter-plot',
  smoke3d: 'weather-fog',
  isof: 'shape-outline'
};

/** Powers of 1024, which is what a file manager means by KB. */
const SIZE_UNITS: readonly string[] = ['B', 'KB', 'MB', 'GB', 'TB'];

/**
 * The results catalog, docked beside the properties palette.
 *
 * A sister of the palette rather than a tab in it: the palette is bound to the
 * selection by contract, and this is bound to the scenario's results folder -
 * two different questions that happen to want the same shelf.
 *
 * Nothing in it loads anything. It lists what the run wrote - format, then
 * quantity group, then one file per mesh - and says which of those files are
 * still on the disk. Opening one is the job of the format readers (#149...#155).
 */
@Component({
  selector: 'app-results-catalog',
  templateUrl: './results-catalog.component.html',
  styleUrls: ['./results-catalog.component.scss'],
  standalone: false
})
export class ResultsCatalogComponent {

  constructor(public results: ResultsDirectoryService) { }

  get catalog(): ResultsCatalog | null {
    return this.results.catalog;
  }

  /** The `.smv` files to choose between, when the folder held several cases. */
  get choices(): readonly string[] {
    return this.results.smvChoice;
  }

  /** What the empty state should show for the state it is in. */
  get emptyIcon(): string {
    switch (this.results.status) {
      // Waiting on the user's folder choice is not a problem to alert about
      case 'picking': return 'folder-search-outline';
      case 'resumable': return 'folder-outline';
      default: return 'alert-circle-outline';
    }
  }

  formatLabel(kind: SmvResultKind): string {
    return FORMAT_LABELS[kind];
  }

  formatIcon(kind: SmvResultKind): string {
    return FORMAT_ICONS[kind];
  }

  sizeOf(file: SmvResultFile): number | null {
    return this.results.sizeOf(file);
  }

  isAbsent(file: SmvResultFile): boolean {
    return this.results.isAbsent(file);
  }

  /**
   * A size the way a person reads one. Result files run from a few kilobytes
   * to several gigabytes, so the unit moves and one decimal is kept while it
   * still says something - `1.4 GB` is worth reading, `1.4 KB` barely.
   */
  formatSize(bytes: number): string {
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < SIZE_UNITS.length - 1) {
      value = value / 1024;
      unit++;
    }

    // Rounding carries: 1 048 500 B is 1023.9 KB, which would print as
    // "1024 KB" - a quantity that already has a name of its own.
    if (unit > 0 && unit < SIZE_UNITS.length - 1 && Math.round(value) >= 1024) {
      value = value / 1024;
      unit++;
    }

    return unit === 0
      ? `${value} B`
      : `${value.toFixed(value < 10 ? 1 : 0)} ${SIZE_UNITS[unit]}`;
  }
}
