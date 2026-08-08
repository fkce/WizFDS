import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';

import { TimelineBarComponent } from './timeline-bar.component';
import { TimelineClient, TimelineService, TimeSpan } from '../../services/timeline/timeline.service';

/**
 * Only what the DOM does. Every playback rule is pinned at the service
 * (timeline.service.spec) - what is left here is whether the bar shows up when
 * there is an axis, renders the readout the instrument way, and hands the
 * pointer's doings to the service.
 */
describe('TimelineBarComponent', () => {

    let fixture: ComponentFixture<TimelineBarComponent>;
    let timeline: TimelineService;

    class FakeClient implements TimelineClient {
        constructor(public span: TimeSpan | null) { }
        public timeSpan(): TimeSpan | null { return this.span; }
        public showAt(): void { }
    }

    const query = (selector: string) =>
        fixture.nativeElement.querySelector(selector) as HTMLElement | null;

    const slider = () => query('input[type=range]') as HTMLInputElement;

    /**
     * What the render tick does: check this component and nothing else,
     * through the very ChangeDetectorRef the component itself holds.
     *
     * Not the fixture's: that one is the host view, and an OnPush child is
     * skipped there unless something has marked it dirty. The timeline moves
     * without touching the DOM, so nothing ever would.
     */
    const repaint = () =>
        fixture.debugElement.injector.get(ChangeDetectorRef).detectChanges();

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [TimelineBarComponent],
            imports: [CommonModule]
        }).compileComponents();

        fixture = TestBed.createComponent(TimelineBarComponent);
        timeline = TestBed.inject(TimelineService);
    });

    it('shows nothing while there is no axis', () => {
        fixture.detectChanges();
        expect(query('.timeline-bar')).toBeNull();
    });

    it('appears once a format holds something', () => {
        timeline.register(new FakeClient({ first: 0, last: 300 }));
        fixture.detectChanges();
        expect(query('.timeline-bar')).not.toBeNull();
    });

    it('reads out the current time against the end of the axis', () => {
        timeline.register(new FakeClient({ first: 0, last: 300 }));
        timeline.seek(12.44);
        fixture.detectChanges();

        expect(query('.readout')?.textContent?.trim()).toBe('12.4 / 300.0 s');
    });

    it('keeps the no-data note in the layout when there is data', () => {
        // Its own slot, always occupied: the note arriving must not shift the
        // readout beside it.
        timeline.register(new FakeClient({ first: 100, last: 300 }));
        timeline.seek(50);
        fixture.detectChanges();
        expect(query('.note')!.classList.contains('hidden')).toBeFalse();

        timeline.seek(150);
        repaint();
        expect(query('.note')!.classList.contains('hidden')).toBeTrue();
    });

    it('runs the slider over the whole axis', () => {
        timeline.register(new FakeClient({ first: 0, last: 300 }));
        fixture.detectChanges();

        expect(slider().min).toBe('0');
        expect(slider().max).toBe('300');
    });

    it('plays and pauses from the button', () => {
        timeline.register(new FakeClient({ first: 0, last: 300 }));
        fixture.detectChanges();

        (query('.play') as HTMLButtonElement).click();
        expect(timeline.playing).toBeTrue();

        (query('.play') as HTMLButtonElement).click();
        expect(timeline.playing).toBeFalse();
    });

    it('takes and gives back the handle as the pointer does', () => {
        timeline.register(new FakeClient({ first: 0, last: 300 }));
        fixture.detectChanges();

        slider().dispatchEvent(new PointerEvent('pointerdown'));
        expect(timeline.grabbed).toBeTrue();

        slider().dispatchEvent(new PointerEvent('pointerup'));
        expect(timeline.grabbed).toBeFalse();
    });

    it('seeks as the handle is dragged', () => {
        timeline.register(new FakeClient({ first: 0, last: 300 }));
        fixture.detectChanges();

        slider().dispatchEvent(new PointerEvent('pointerdown'));
        slider().value = '120';
        slider().dispatchEvent(new Event('input'));

        expect(timeline.time).toBe(120);
    });

    it('does not move the handle under the pointer while it is held', () => {
        // The tick calls detectChanges sixty times a second; writing the value
        // back while the handle is held would fight the drag.
        timeline.register(new FakeClient({ first: 0, last: 300 }));
        fixture.detectChanges();

        slider().dispatchEvent(new PointerEvent('pointerdown'));
        slider().value = '120';
        slider().dispatchEvent(new Event('input'));

        timeline.seek(7);
        repaint();

        expect(slider().value).toBe('120');
    });

    it('follows the time once the handle is let go', () => {
        timeline.register(new FakeClient({ first: 0, last: 300 }));
        fixture.detectChanges();

        slider().dispatchEvent(new PointerEvent('pointerdown'));
        slider().dispatchEvent(new PointerEvent('pointerup'));
        timeline.seek(7);
        repaint();

        expect(slider().value).toBe('7');
    });

    it('offers the rate ladder and passes a choice on', () => {
        timeline.register(new FakeClient({ first: 0, last: 300 }));
        fixture.detectChanges();

        const rate = query('select.rate') as HTMLSelectElement;
        expect(rate.options.length).toBeGreaterThan(1);

        rate.value = '25';
        rate.dispatchEvent(new Event('change'));

        expect(timeline.rate).toBe(25);
    });
});
