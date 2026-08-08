import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit
} from '@angular/core';
import { Subscription } from 'rxjs';

import {
  COLORBARS, colorbarByName, colorbarTexels, COLORBAR_TEXELS
} from '../../consts/colorbars';
import {
  QuantityScaleService, QuantityScaleView, ScaleEnd
} from '../../services/scale/quantity-scale.service';
import { formatScaleValue } from './format-value';

/** Labelled steps on the bar, ends included. */
const TICKS = 6;

/** One tick: what it says, and how far up the bar it says it. */
interface LegendTick {
  readonly text: string;
  /** Percent from the bottom. */
  readonly at: number;
}

/** One quantity's legend, with everything the template needs precomputed. */
interface LegendRow {
  readonly key: string;
  readonly label: string;
  readonly unit: string;
  /** The palette as a CSS gradient, bottom to top. */
  readonly gradient: string;
  readonly ticks: readonly LegendTick[];
  /** What the data reaches past a manual end, or null when nothing is cut off. */
  readonly above: string | null;
  readonly below: string | null;
  /** What the fields show: the manual value, or the automatic one as a hint. */
  readonly minField: string;
  readonly maxField: string;
  readonly minManual: boolean;
  readonly maxManual: boolean;
  readonly manual: boolean;
  readonly palette: string;
}

/**
 * The stack of scale legends ("Legenda", CONTEXT.md): one per loaded quantity,
 * standing at the edge of the canvas.
 *
 * In the library rather than in either host, for the reason the timeline bar is
 * (the 2026-08-07 addendum to ADR-0010): both consumers want the same legend and
 * neither has anything to decide about it. It is deliberately not part of the
 * results catalog, which is closable - closing that panel must not take away the
 * scale of what is still on screen, any more than it may take away playback.
 *
 * A legend is also the only place the range is cut and the palette chosen, and
 * those controls stay folded away until the legend is opened: the bar is read
 * continuously and typed into about once a session.
 */
@Component({
  selector: 'lib-quantity-legend',
  templateUrl: './quantity-legend.component.html',
  styleUrls: ['./quantity-legend.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class QuantityLegendComponent implements OnInit, OnDestroy {

  public rows: readonly LegendRow[] = [];

  /** The palettes offered, in SmokeView's own order. */
  public readonly palettes = COLORBARS.map(colorbar => colorbar.name);

  /** Which legends the user has opened the controls of. */
  private readonly opened = new Set<string>();

  private subscription: Subscription | null = null;

  constructor(
    private scales: QuantityScaleService,
    private changeDetector: ChangeDetectorRef
  ) { }

  public ngOnInit(): void {
    this.subscription = this.scales.scales$.subscribe(views => {
      this.rows = views.map(view => this.rowOf(view));
      // Opening a legend that is no longer loaded would reopen it if the same
      // quantity came back, which is not what the user last did to it.
      const live = new Set(views.map(view => view.key));
      this.opened.forEach(key => { if (!live.has(key)) { this.opened.delete(key); } });
      this.changeDetector.markForCheck();
    });
  }

  public ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  public isOpen(key: string): boolean {
    return this.opened.has(key);
  }

  public toggle(key: string): void {
    if (!this.opened.delete(key)) { this.opened.add(key); }
  }

  /** An emptied field hands the end back to the data; anything else pins it. */
  public onEnd(key: string, end: ScaleEnd, event: Event): void {
    const field = event.target as HTMLInputElement;
    const typed = field.value.trim();
    this.scales.setEnd(key, end, typed === '' ? null : Number(typed));

    // Whatever the service made of it is what the field has to show, and the
    // binding cannot be relied on to say so: a refused value publishes nothing,
    // so `rows` is rebuilt to the same strings it already held and Angular
    // writes nothing back. The field would go on answering with a number the
    // scale does not use. Written here rather than left to change detection.
    const row = this.rows.find(candidate => candidate.key === key);
    if (row) { field.value = end === 'min' ? row.minField : row.maxField; }
    this.changeDetector.markForCheck();
  }

  public onPalette(key: string, event: Event): void {
    this.scales.setPalette(key, (event.target as HTMLSelectElement).value);
  }

  public onAuto(key: string): void {
    this.scales.setEnd(key, 'min', null);
    this.scales.setEnd(key, 'max', null);
  }

  public trackByKey(_: number, row: LegendRow): string {
    return row.key;
  }

  private rowOf(view: QuantityScaleView): LegendRow {
    return {
      key: view.key,
      label: view.quantity.label,
      unit: view.quantity.unit,
      gradient: gradientOf(view.scale.palette),
      ticks: ticksOf(view.scale.min, view.scale.max),
      // Only a manual end can hide anything: an automatic one is the data.
      above: view.maxOverride !== null && view.extent.max > view.scale.max
        ? formatScaleValue(view.extent.max) : null,
      below: view.minOverride !== null && view.extent.min < view.scale.min
        ? formatScaleValue(view.extent.min) : null,
      minField: fieldOf(view.scale.min, view.minOverride),
      maxField: fieldOf(view.scale.max, view.maxOverride),
      minManual: view.minOverride !== null,
      maxManual: view.maxOverride !== null,
      manual: view.minOverride !== null || view.maxOverride !== null,
      palette: view.scale.palette
    };
  }
}

/**
 * What an editable end shows.
 *
 * A pinned end shows the number the user typed, exactly - three significant
 * digits are right for a tick, which is read, and wrong for a field, which is
 * edited: a max pinned at 123456 would come back as `1.23e+5` and the next edit
 * of that field would submit 123000, quietly throwing away the user's own
 * number. An end still following the data is a readout, so it is written the
 * way the ticks are.
 */
function fieldOf(inForce: number, override: number | null): string {
  return override === null ? formatScaleValue(inForce) : String(override);
}

/**
 * The palette as a CSS gradient, bottom to top.
 *
 * One stop per texel. Fewer would be cheaper, but several palettes are built
 * around a hard break, and a break sampled every eighth texel turns into a
 * three-pixel smear - the one thing those palettes exist to avoid. It is built
 * once per change, not once per check.
 */
function gradientOf(name: string): string {
  const texels = colorbarTexels(colorbarByName(name));
  const stops: string[] = [];
  for (let at = 0; at < COLORBAR_TEXELS; at++) {
    const percent = (at / (COLORBAR_TEXELS - 1)) * 100;
    stops.push(`rgb(${texels[at * 4]},${texels[at * 4 + 1]},${texels[at * 4 + 2]}) ${percent.toFixed(2)}%`);
  }
  return `linear-gradient(to top, ${stops.join(',')})`;
}

/**
 * The labelled steps, top of the bar first.
 *
 * A range with no width gets one label rather than six copies of the same
 * number: there is one value in it, and six of them would suggest a scale.
 */
function ticksOf(min: number, max: number): LegendTick[] {
  if (!(max > min)) {
    return [{ text: formatScaleValue(min), at: 50 }];
  }

  const ticks: LegendTick[] = [];
  for (let step = TICKS - 1; step >= 0; step--) {
    const along = step / (TICKS - 1);
    ticks.push({ text: formatScaleValue(min + along * (max - min)), at: along * 100 });
  }
  return ticks;
}
