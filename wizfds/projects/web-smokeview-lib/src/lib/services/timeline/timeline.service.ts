import { Injectable } from '@angular/core';
import { SceneLifecycleService, SceneScoped } from '../babylon/scene-lifecycle.service';

/** What one format currently holds: the time of its first and last frame. */
export interface TimeSpan {
    readonly first: number;
    readonly last: number;
}

/**
 * An animated results format hanging on the shared timeline.
 *
 * Two methods, and deliberately no third: the format says what it has, and is
 * told which moment to show. How a moment becomes a frame is the format's own
 * business - see frameAt() and ADR-0018. Formats register themselves in their
 * constructors, exactly as they do with the scene lifecycle, so adding one is
 * a line there rather than an edit here.
 */
export interface TimelineClient {
    /** null while nothing is loaded - a format with nothing has no span. */
    timeSpan(): TimeSpan | null;
    /** Show the state at `time`, in simulation seconds. */
    showAt(time: number): void;
}

/** The rates offered, as multipliers of real time. 1 is real time. */
export const RATE_LADDER: readonly number[] = [1, 2, 5, 10, 25, 50, 100];

/** How long a whole run should take to watch when its axis first appears. */
const OPENING_WALL_SECONDS = 30;

/**
 * The longest step one frame may take, in milliseconds.
 *
 * This is what makes the render-loop clock behave as ADR-0018 says it does.
 * `getDeltaTime()` is wall time since the previous frame and has no ceiling:
 * a frame that took half a second while a group parsed would otherwise hand
 * the clock half a second at once, skipping every simulation frame in between
 * - the very jump the interval-based player was rejected for. Worse, the first
 * frame after a backgrounded tab carries the whole time spent away.
 *
 * Clamped, a stalled frame costs the clock time instead: playback falls behind
 * the wall clock rather than running ahead of the picture. At any normal frame
 * rate the ceiling is never reached.
 */
const MAX_STEP_MS = 100;

/**
 * The shared timeline: one clock in simulation seconds for every animated
 * format on screen ("Oś czasu", CONTEXT.md).
 *
 * Time enters through advance(), which the render loop calls once a frame with
 * the frame's own delta. Reading the engine clock here instead would tie every
 * playback rule to a live scene and to wall-clock timing - see ADR-0018, which
 * also records what the render-loop clock costs: playback slows when rendering
 * cannot keep up, and holds while the tab is in the background.
 */
@Injectable({
    providedIn: 'root'
})
export class TimelineService implements SceneScoped {

    private readonly clients = new Set<TimelineClient>();

    private current = 0;
    private running = false;
    private held = false;
    /** null until the axis has been seen at least once - see rate. */
    private chosenRate: number | null = null;

    constructor(sceneLifecycle: SceneLifecycleService) {
        sceneLifecycle.register(this);
    }

    public register(client: TimelineClient): void {
        this.clients.add(client);
    }

    public get time(): number { return this.current; }

    public get playing(): boolean { return this.running; }

    public get grabbed(): boolean { return this.held; }

    /** The last frame of the longest loaded format; 0 when nothing is loaded. */
    public get end(): number {
        return this.spans().reduce((end, span) => Math.max(end, span.last), 0);
    }

    /** Whether any format holds anything - and so whether there is an axis at all. */
    public get hasAxis(): boolean {
        return this.spans().length > 0;
    }

    /**
     * Whether anything on screen has reached the current time.
     *
     * False in the gap the axis leaves before the first frame (T_BEGIN above
     * zero, or a format that starts later than another): nothing is drawn
     * there, and the bar says so rather than leaving an empty scene looking
     * like a failure.
     */
    public get hasData(): boolean {
        return this.spans().some(span => span.first <= this.current);
    }

    /**
     * The playback rate, chosen from the data the first time it is asked for
     * with an axis present, and left alone afterwards.
     *
     * 1x is the honest default and a useless one: at real time a fire takes as
     * long to watch as it took to burn. The opening rate instead plays the
     * whole run in about half a minute, which is the length of every scenario
     * from a corridor to a tunnel. Recomputing it as groups load and unload
     * would change speed under the user's hand mid-playback, so it is computed
     * once per case (ADR-0018).
     */
    public get rate(): number {
        if (this.chosenRate === null) {
            const end = this.end;
            if (end <= 0) { return RATE_LADDER[0]; }
            this.chosenRate = nearestRate(end / OPENING_WALL_SECONDS);
        }
        return this.chosenRate;
    }

    public setRate(rate: number): void {
        this.chosenRate = rate;
    }

    /** Play, rewinding first when the axis is already at its end. */
    public play(): void {
        if (!this.hasAxis) { return; }
        if (this.current >= this.end) { this.setTime(0); }
        this.running = true;
    }

    public pause(): void {
        this.running = false;
    }

    public toggle(): void {
        if (this.running) { this.pause(); } else { this.play(); }
    }

    public seek(time: number): void {
        this.setTime(time);
    }

    /**
     * The slider handle has been taken, and owns the time until released.
     *
     * One writer at a time: the clock stands still for as long as this holds,
     * so the scene never drifts away from where the pointer put it. Releasing
     * restores nothing because nothing was changed - playback was suspended,
     * not stopped.
     */
    public grab(): void { this.held = true; }

    public release(): void { this.held = false; }

    /**
     * One render frame. Called every frame whether or not anything is playing,
     * because this is also where the axis is caught up with: a group unloaded
     * mid-playback shortens it, and the time has to come back inside.
     *
     * `deltaMs` is the frame's own delta, in milliseconds, as the engine
     * reports it.
     */
    public advance(deltaMs: number): void {
        const end = this.end;
        // Only while there is an axis: unloading everything hides the bar but
        // keeps the position, so that switching quantities returns to the same
        // instant.
        if (end > 0 && this.current > end) { this.setTime(end); }

        if (!this.running || this.held || end <= 0) { return; }

        const step = Math.min(deltaMs, MAX_STEP_MS);
        const next = this.current + (step / 1000) * this.rate;
        if (next >= end) {
            // The final state of the simulation is one of the two moments
            // looked at longest; playback stops on it rather than looping past.
            this.setTime(end);
            this.running = false;
            return;
        }
        this.setTime(next);
    }

    /**
     * A different case is being opened: back to the start, rate to be re-chosen.
     *
     * Unlike resetSceneState() this one goes through setTime, so the formats
     * are told - the scene is still alive here, and whatever they still hold
     * has to come back to the start with the axis.
     */
    public resetForNewCase(): void {
        this.running = false;
        this.held = false;
        this.chosenRate = null;
        this.setTime(0);
    }

    /**
     * The scene is gone. The clients stay registered - they registered in their
     * constructors and are never constructed again, so dropping them here would
     * leave the axis permanently empty.
     *
     * The time is dropped without telling them, unlike resetForNewCase(): their
     * meshes died with the scene, and asking a format to show a moment now
     * would have it write into corpses.
     */
    public resetSceneState(): void {
        this.running = false;
        this.held = false;
        this.chosenRate = null;
        this.current = 0;
    }

    /** Every client's span, skipping those holding nothing. */
    private spans(): TimeSpan[] {
        const spans: TimeSpan[] = [];
        this.clients.forEach(client => {
            const span = client.timeSpan();
            if (span) { spans.push(span); }
        });
        return spans;
    }

    private setTime(time: number): void {
        const end = this.end;
        const clamped = end > 0
            ? Math.min(Math.max(time, 0), end)
            : Math.max(time, 0);
        if (clamped === this.current) { return; }

        this.current = clamped;
        this.clients.forEach(client => client.showAt(clamped));
    }
}

/**
 * The span covering all of `spans`, or null when none of them is one.
 *
 * Shared with the formats: a group folds its files this way and the service
 * folds its groups the same, so "what is loaded spans this" has one meaning.
 */
export function mergeSpans(spans: readonly (TimeSpan | null)[]): TimeSpan | null {
    let first = Number.POSITIVE_INFINITY;
    let last = Number.NEGATIVE_INFINITY;
    for (const span of spans) {
        if (!span) { continue; }
        if (span.first < first) { first = span.first; }
        if (span.last > last) { last = span.last; }
    }
    return first <= last ? { first: first, last: last } : null;
}

/** The ladder step closest to `wanted`; ties go to the slower one. */
function nearestRate(wanted: number): number {
    let best = RATE_LADDER[0];
    let distance = Math.abs(best - wanted);
    RATE_LADDER.forEach(rate => {
        const candidate = Math.abs(rate - wanted);
        if (candidate < distance) { best = rate; distance = candidate; }
    });
    return best;
}
