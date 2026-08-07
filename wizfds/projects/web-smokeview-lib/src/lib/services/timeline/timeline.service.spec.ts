import { TestBed } from '@angular/core/testing';

import { RATE_LADDER, TimelineClient, TimelineService, TimeSpan } from './timeline.service';

/**
 * The whole of "Oś czasu" (CONTEXT.md) except the two things that cannot live
 * here: mapping a time to a frame, which belongs to the format (frame-at.spec),
 * and what the bar puts on screen (timeline-bar.component.spec).
 *
 * Playback is driven through advance(), never by reading a clock - that is the
 * decision in ADR-0018 that makes every rule below assertable without a scene.
 */
describe('TimelineService', () => {

    let service: TimelineService;

    /** A format standing in for SliceService: what it holds, and what it was told. */
    class FakeClient implements TimelineClient {
        public shown: number[] = [];
        constructor(public span: TimeSpan | null) { }
        public timeSpan(): TimeSpan | null { return this.span; }
        public showAt(time: number): void { this.shown.push(time); }
        public get last(): number | undefined { return this.shown[this.shown.length - 1]; }
    }

    /** A client whose axis runs 0..end, which is what a normal run looks like. */
    const loaded = (end: number, first = 0) => new FakeClient({ first: first, last: end });

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(TimelineService);
    });

    describe('the axis', () => {

        it('does not exist before anything is loaded', () => {
            expect(service.hasAxis).toBeFalse();
            expect(service.end).toBe(0);
            expect(service.time).toBe(0);
        });

        it('does not exist while every registered format holds nothing', () => {
            service.register(new FakeClient(null));
            expect(service.hasAxis).toBeFalse();
        });

        it('runs from zero to the last frame of what is loaded', () => {
            service.register(loaded(300));
            expect(service.hasAxis).toBeTrue();
            expect(service.end).toBe(300);
        });

        it('reaches the end of the longest format, not of the first', () => {
            service.register(loaded(120));
            service.register(loaded(300));
            service.register(new FakeClient(null));
            expect(service.end).toBe(300);
        });

        it('grows when a longer format is loaded', () => {
            const second = new FakeClient(null);
            service.register(loaded(120));
            service.register(second);
            expect(service.end).toBe(120);

            second.span = { first: 0, last: 600 };
            expect(service.end).toBe(600);
        });

        it('shrinks when a format is unloaded, clamping the time without zeroing it', () => {
            const long = loaded(600);
            service.register(loaded(120));
            service.register(long);
            service.seek(400);

            long.span = null;
            service.advance(0);

            expect(service.end).toBe(120);
            expect(service.time).toBe(120);
        });

        it('keeps the time when the last format is unloaded and the axis goes away', () => {
            const only = loaded(300);
            service.register(only);
            service.seek(180);

            only.span = null;
            service.advance(0);

            expect(service.hasAxis).toBeFalse();
            expect(service.time).toBe(180);
        });
    });

    describe('what the formats are told', () => {

        it('tells every format the time it seeks to', () => {
            const first = loaded(300);
            const second = loaded(300);
            service.register(first);
            service.register(second);

            service.seek(42);

            expect(first.last).toBe(42);
            expect(second.last).toBe(42);
        });

        it('tells them the new time as playback runs', () => {
            const client = loaded(300);
            service.register(client);
            service.setRate(1);
            service.play();

            service.advance(100);

            expect(client.last).toBeCloseTo(0.1, 6);
        });

        it('says nothing while the time stands still', () => {
            const client = loaded(300);
            service.register(client);
            service.seek(10);
            const told = client.shown.length;

            service.advance(16);
            service.advance(16);

            expect(client.shown.length).toBe(told);
        });

        it('reports no data while the time is before every first frame', () => {
            service.register(loaded(300, 100));
            expect(service.hasAxis).toBeTrue();

            service.seek(50);
            expect(service.hasData).toBeFalse();

            service.seek(100);
            expect(service.hasData).toBeTrue();
        });
    });

    describe('playback', () => {

        let client: FakeClient;

        beforeEach(() => {
            client = loaded(300);
            service.register(client);
            service.setRate(1);
        });

        it('stands still until told to play', () => {
            service.advance(50);
            expect(service.time).toBe(0);
            expect(service.playing).toBeFalse();
        });

        it('advances in simulation seconds per real millisecond', () => {
            service.play();
            service.advance(50);
            expect(service.time).toBeCloseTo(0.05, 6);
        });

        it('advances by the rate multiplier', () => {
            service.setRate(10);
            service.play();
            service.advance(50);
            expect(service.time).toBeCloseTo(0.5, 6);
        });

        it('never takes more than a frame-sized step, however long the frame took', () => {
            // A frame that stalled - a group parsing, or the tab coming back
            // from the background - must not hand the clock the whole gap at
            // once and skip every simulation frame inside it.
            service.play();

            service.advance(5000);

            expect(service.time).toBeGreaterThan(0);
            expect(service.time).toBeLessThanOrEqual(0.1);
        });

        it('stops at the end of the axis instead of running past it', () => {
            service.setRate(100);
            service.seek(299);
            service.play();

            service.advance(100);

            expect(service.time).toBe(300);
            expect(service.playing).toBeFalse();
        });

        it('rewinds when play is pressed at the end', () => {
            service.seek(300);
            service.play();
            expect(service.time).toBe(0);
            expect(service.playing).toBeTrue();
        });

        it('does not rewind when play is pressed anywhere else', () => {
            service.seek(120);
            service.play();
            expect(service.time).toBe(120);
        });

        it('holds the time while paused mid-run', () => {
            service.play();
            service.advance(50);
            service.pause();
            service.advance(50);
            expect(service.time).toBeCloseTo(0.05, 6);
        });

        it('does not run while there is no axis', () => {
            client.span = null;

            service.play();
            service.advance(50);

            expect(service.time).toBe(0);
        });

        it('clamps a seek to the axis at both ends', () => {
            service.seek(-10);
            expect(service.time).toBe(0);
            service.seek(1000);
            expect(service.time).toBe(300);
        });
    });

    describe('the grabbed handle', () => {

        beforeEach(() => {
            service.register(loaded(300));
            service.setRate(1);
        });

        it('holds the clock while the handle is held', () => {
            service.play();
            service.grab();

            service.advance(50);

            expect(service.time).toBe(0);
        });

        it('lets the seek through while holding it', () => {
            service.play();
            service.grab();
            service.seek(75);
            expect(service.time).toBe(75);
        });

        it('carries on from where it was let go, when it was playing', () => {
            service.play();
            service.grab();
            service.seek(75);
            service.release();

            service.advance(100);

            expect(service.playing).toBeTrue();
            expect(service.time).toBeCloseTo(75.1, 6);
        });

        it('stays still after being let go, when it was paused', () => {
            service.grab();
            service.seek(75);
            service.release();

            service.advance(50);

            expect(service.playing).toBeFalse();
            expect(service.time).toBe(75);
        });
    });

    describe('the playback rate', () => {

        it('offers a ladder from real time upwards', () => {
            expect(RATE_LADDER[0]).toBe(1);
            expect(RATE_LADDER).toEqual([...RATE_LADDER].sort((a, b) => a - b));
        });

        it('opens at the step that plays the whole run in about half a minute', () => {
            service.register(loaded(300));
            expect(service.rate).toBe(10);
        });

        it('opens slower for a short run and faster for a long one', () => {
            const client = loaded(60);
            service.register(client);
            expect(service.rate).toBe(2);

            service.resetForNewCase();
            client.span = { first: 0, last: 3600 };

            expect(service.rate).toBe(100);
        });

        it('is not recomputed when another format is loaded', () => {
            const second = new FakeClient(null);
            service.register(loaded(300));
            service.register(second);
            expect(service.rate).toBe(10);

            second.span = { first: 0, last: 3600 };
            service.advance(0);

            expect(service.rate).toBe(10);
        });

        it('keeps what the user chose', () => {
            service.register(loaded(300));
            service.setRate(2);
            service.advance(0);
            expect(service.rate).toBe(2);
        });
    });

    describe('lifecycle', () => {

        it('starts a new case from zero and picks its rate again', () => {
            const client = loaded(300);
            service.register(client);
            service.seek(120);
            expect(service.rate).toBe(10);

            service.resetForNewCase();
            client.span = { first: 0, last: 60 };

            expect(service.time).toBe(0);
            expect(service.rate).toBe(2);
        });

        it('stops and rewinds when the scene goes', () => {
            service.register(loaded(300));
            service.seek(120);
            service.play();

            service.resetSceneState();

            expect(service.time).toBe(0);
            expect(service.playing).toBeFalse();
        });

        it('keeps its formats registered across a scene reset', () => {
            // They register in their constructors and are never constructed
            // again - dropping them here would leave the axis permanently empty.
            service.register(loaded(300));
            service.resetSceneState();
            expect(service.hasAxis).toBeTrue();
        });
    });
});
