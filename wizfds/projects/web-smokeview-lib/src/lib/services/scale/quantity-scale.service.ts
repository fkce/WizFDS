import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SceneLifecycleService, SceneScoped } from '../babylon/scene-lifecycle.service';
import { DEFAULT_COLORBAR } from '../../consts/colorbars';

/**
 * A physical quantity, as the `.smv` spells it.
 *
 * The pair is the identity (ADR-0019): the same words in a different unit are
 * a different scale, and merging them would have the colour state a number it
 * does not mean. The group label cannot serve - it carries the slice position
 * and the cell-centred suffix, which are about where the numbers were sampled,
 * not about what they are.
 */
export interface Quantity {
    /** `TEMPERATURE`, the long label. */
    readonly label: string;
    /** `C`, as written beside it. */
    readonly unit: string;
}

/** What one client holds of one quantity: the extremes of its visible values. */
export interface QuantityExtent {
    readonly quantity: Quantity;
    readonly min: number;
    readonly max: number;
}

/** How a quantity is to be drawn: the ends in force, and the palette. */
export interface QuantityScale {
    readonly min: number;
    readonly max: number;
    /** A name from `consts/colorbars`. */
    readonly colorbar: string;
}

/**
 * A results format hanging on the shared scale.
 *
 * Two methods, and deliberately no third - the twin of `TimelineClient`: the
 * format says what it holds, and is told what to draw it with. Formats register
 * themselves in their constructors, so adding one is a line there rather than
 * an edit here.
 */
export interface ScaleClient {
    /** Keyed by quantityKey(); one entry per quantity, folded across its groups. */
    quantityExtents(): ReadonlyMap<string, QuantityExtent>;
    /** Draw this quantity with this scale. Only for quantities the client holds. */
    applyScale(quantity: string, scale: QuantityScale): void;
}

/** Which end of the range an override names. */
export type ScaleEnd = 'min' | 'max';

/** One row of the legend: the scale in force, and everything behind it. */
export interface QuantityScaleView {
    /** The key, as `scaleFor()` and `setEnd()` take it. */
    readonly key: string;
    readonly quantity: Quantity;
    /** The ends actually in force, and the palette drawing them. */
    readonly scale: QuantityScale;
    /** What the loaded data spans - computed whether or not it is overridden. */
    readonly extent: { readonly min: number, readonly max: number };
    readonly minOverride: number | null;
    readonly maxOverride: number | null;
}

/**
 * The identity of a quantity, as everything here is keyed on.
 *
 * A separator no FDS quantity label contains. Nothing splits the key back
 * apart - the views carry the pair - so this only has to be unique.
 */
export function quantityKey(quantity: Quantity): string {
    return `${quantity.label}|${quantity.unit}`;
}

/** The manual ends of one quantity, and the palette chosen for it. */
interface Override {
    min: number | null;
    max: number | null;
    colorbar: string;
}

/**
 * The shared value->colour scale: one range and one palette per physical
 * quantity, for every format on screen ("Zakres wielkości", CONTEXT.md).
 *
 * Nothing is cached. The range is folded out of the clients whenever it is
 * asked for, exactly as `TimelineService.end` is, so it is a function of what
 * is loaded and has no history to go stale. What *is* held is what the user
 * said: the manual ends and the chosen palette, which survive a group being
 * unloaded and reloaded and die with the case.
 *
 * Pushing is explicit. An override or a palette change is pushed here, because
 * the service is where it happens; a load or an unload is pushed by the format
 * calling refresh(), because the axis's trick of catching up on the render loop
 * would be a pulse sixty times a second for an event that happens a handful of
 * times a session (ADR-0019).
 */
@Injectable({
    providedIn: 'root'
})
export class QuantityScaleService implements SceneScoped {

    private readonly clients = new Set<ScaleClient>();

    /** Keyed by quantityKey(). Only quantities the user has touched appear. */
    private readonly overrides = new Map<string, Override>();

    private readonly viewsSubject = new BehaviorSubject<readonly QuantityScaleView[]>([]);

    /**
     * What the legend draws, re-emitted whenever any of it moves.
     *
     * A narrow stream rather than a per-frame read (ADR-0007): the scales change
     * a handful of times a session - a group loaded, an end typed - and each of
     * those already happens inside an Angular event.
     */
    public readonly scales$ = this.viewsSubject.asObservable();

    constructor(sceneLifecycle: SceneLifecycleService) {
        sceneLifecycle.register(this);
    }

    public register(client: ScaleClient): void {
        this.clients.add(client);
    }

    /** A group has been loaded or unloaded: settle the scales and hand them out. */
    public refresh(): void {
        this.publish();
    }

    /** The scale a quantity is drawn with, or null when nothing holds it. */
    public scaleFor(key: string): QuantityScale | null {
        const extent = this.extents().get(key);
        return extent ? this.scaleOf(key, extent) : null;
    }

    /**
     * Every loaded quantity, for the legend - in the order the labels sort in,
     * so that loading a second quantity does not reshuffle the first.
     */
    public all(): readonly QuantityScaleView[] {
        const views: QuantityScaleView[] = [];
        this.extents().forEach((extent, key) => views.push({
            key: key,
            quantity: extent.quantity,
            scale: this.scaleOf(key, extent),
            extent: { min: extent.min, max: extent.max },
            minOverride: this.overrides.get(key)?.min ?? null,
            maxOverride: this.overrides.get(key)?.max ?? null
        }));
        return views.sort((a, b) => a.key.localeCompare(b.key));
    }

    /**
     * Pin one end of a quantity's range, or hand it back to the data with null.
     *
     * Each end stands on its own: capping the top of TEMPERATURE at 200 leaves
     * the bottom following whatever gets loaded, which is how the range is
     * usually cut ("Zakres wielkości", CONTEXT.md).
     *
     * An end that would turn the range inside out is refused rather than
     * clamped or swapped. A silently corrected number is worse than none: the
     * field would answer with a value nobody typed, and the scale would be one
     * nobody chose. The end it is judged against is the one *in force* - the
     * other override where there is one, the data where there is not - so both
     * ends can be typed in either order.
     */
    public setEnd(key: string, end: ScaleEnd, value: number | null): void {
        if (value !== null && !this.acceptable(key, end, value)) { return; }

        const override = this.overrides.get(key);
        // Nothing held and nothing to hold: clearing an end never invents one.
        if (value === null && override === undefined) { return; }

        this.overrideFor(key)[end] = value;
        this.publish();
    }

    /** Draw this quantity with that palette, by name from `consts/colorbars`. */
    public setPalette(key: string, colorbar: string): void {
        this.overrideFor(key).colorbar = colorbar;
        this.publish();
    }

    /**
     * The scene is gone; so is everything the user set on it.
     *
     * The clients stay registered - they registered in their constructors and
     * are never constructed again - but none of them is asked anything here:
     * their meshes died with the scene, and the legend has nothing left to
     * describe either way.
     */
    public resetSceneState(): void {
        this.overrides.clear();
        this.viewsSubject.next([]);
    }

    /** A different case is being opened - see SliceService.setCase(). */
    public resetForNewCase(): void {
        this.overrides.clear();
        this.publish();
    }

    /** Whether that end may take that value - see setEnd(). */
    private acceptable(key: string, end: ScaleEnd, value: number): boolean {
        if (!Number.isFinite(value)) { return false; }

        const override = this.overrides.get(key);
        const extent = this.extents().get(key);
        return end === 'min'
            ? value < (override?.max ?? extent?.max ?? Number.POSITIVE_INFINITY)
            : value > (override?.min ?? extent?.min ?? Number.NEGATIVE_INFINITY);
    }

    /** What the user has set for this quantity, started from the defaults. */
    private overrideFor(key: string): Override {
        const held = this.overrides.get(key);
        if (held) { return held; }

        const fresh: Override = { min: null, max: null, colorbar: DEFAULT_COLORBAR };
        this.overrides.set(key, fresh);
        return fresh;
    }

    /** What every client holds, folded per quantity. */
    private extents(): Map<string, QuantityExtent> {
        const folded = new Map<string, QuantityExtent>();
        this.clients.forEach(client => client.quantityExtents().forEach((extent, key) => {
            const held = folded.get(key);
            folded.set(key, held === undefined ? extent : {
                quantity: held.quantity,
                min: Math.min(held.min, extent.min),
                max: Math.max(held.max, extent.max)
            });
        }));
        return folded;
    }

    /** The ends in force for a quantity: the manual ones where they are set. */
    private scaleOf(key: string, extent: QuantityExtent): QuantityScale {
        const override = this.overrides.get(key);
        return {
            min: override?.min ?? extent.min,
            max: override?.max ?? extent.max,
            colorbar: override?.colorbar ?? DEFAULT_COLORBAR
        };
    }

    /** Hand each client the scale of every quantity it holds, and no other. */
    private publish(): void {
        const extents = this.extents();
        this.clients.forEach(client => client.quantityExtents().forEach((_, key) => {
            const extent = extents.get(key);
            if (extent) { client.applyScale(key, this.scaleOf(key, extent)); }
        }));
        this.viewsSubject.next(this.all());
    }
}
