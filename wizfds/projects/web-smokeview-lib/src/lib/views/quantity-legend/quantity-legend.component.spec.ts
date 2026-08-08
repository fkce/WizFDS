import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';

import { QuantityLegendComponent } from './quantity-legend.component';
import {
    QuantityExtent, QuantityScaleService, ScaleClient, quantityKey
} from '../../services/scale/quantity-scale.service';

/**
 * Only what the DOM does. Every rule about what a range is lives at the service
 * (quantity-scale.service.spec); what is left here is whether the stack shows
 * up when there is something to describe, says which values are cut off, and
 * hands what the user typed back to the service.
 */
describe('QuantityLegendComponent', () => {

    let fixture: ComponentFixture<QuantityLegendComponent>;
    let scales: QuantityScaleService;

    const TEMPERATURE = quantityKey({ label: 'TEMPERATURE', unit: 'C' });

    class FakeClient implements ScaleClient {
        public held = new Map<string, QuantityExtent>();
        public quantityExtents(): ReadonlyMap<string, QuantityExtent> { return this.held; }
        public applyScale(): void { }
    }

    const query = (selector: string) =>
        fixture.nativeElement.querySelector(selector) as HTMLElement | null;
    const queryAll = (selector: string) =>
        Array.from(fixture.nativeElement.querySelectorAll(selector)) as HTMLElement[];

    /** Load a quantity and let the legend catch up with it. */
    const load = (label: string, unit: string, min: number, max: number): void => {
        const client = new FakeClient();
        const quantity = { label: label, unit: unit };
        client.held.set(quantityKey(quantity), { quantity: quantity, min: min, max: max });
        scales.register(client);
        scales.refresh();
        fixture.detectChanges();
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [QuantityLegendComponent],
            imports: [CommonModule]
        }).compileComponents();

        fixture = TestBed.createComponent(QuantityLegendComponent);
        scales = TestBed.inject(QuantityScaleService);
        fixture.detectChanges();
    });

    it('shows nothing while nothing is loaded', () => {
        expect(query('.legend')).toBeNull();
    });

    it('stands one legend up per loaded quantity', () => {
        load('TEMPERATURE', 'C', 20, 340);
        load('VELOCITY', 'm/s', 0, 12);

        expect(queryAll('.legend').length).toBe(2);
    });

    it('names the quantity the way the catalog does, with its unit', () => {
        load('TEMPERATURE', 'C', 20, 340);

        expect(query('.label').textContent).toContain('TEMPERATURE');
        expect(query('.unit').textContent).toContain('C');
    });

    it('labels both ends of the scale and four steps between them', () => {
        load('TEMPERATURE', 'C', 20, 340);

        const ticks = queryAll('.tick').map(tick => tick.textContent.trim());
        expect(ticks.length).toBe(6);
        // Top down, as the bar reads.
        expect(ticks[0]).toBe('340');
        expect(ticks[5]).toBe('20');
    });

    it('says the one value a constant field holds, and says it once', () => {
        load('TEMPERATURE', 'C', 20, 20);

        const ticks = queryAll('.tick').map(tick => tick.textContent.trim());
        expect(ticks).toEqual(['20']);
    });

    it('keeps quiet about values outside the range while the range is the data', () => {
        load('TEMPERATURE', 'C', 20, 340);

        expect(query('.beyond')).toBeNull();
    });

    it('says what a manual end is cutting off, and how much', () => {
        load('TEMPERATURE', 'C', 20, 512);

        scales.setEnd(TEMPERATURE, 'max', 200);
        fixture.detectChanges();

        const beyond = query('.beyond.above');
        expect(beyond).not.toBeNull();
        expect(beyond.textContent).toContain('512');
        expect(query('.beyond.below')).toBeNull();
    });

    it('stops saying it once the manual end stops cutting anything off', () => {
        load('TEMPERATURE', 'C', 20, 512);
        scales.setEnd(TEMPERATURE, 'max', 200);
        fixture.detectChanges();

        scales.setEnd(TEMPERATURE, 'max', null);
        fixture.detectChanges();

        expect(query('.beyond')).toBeNull();
    });

    it('keeps its controls out of the way until the legend is opened', () => {
        load('TEMPERATURE', 'C', 20, 340);

        expect(query('.controls')).toBeNull();

        query('.head').click();
        fixture.detectChanges();

        expect(query('.controls')).not.toBeNull();
    });

    it('hands a typed end to the service', () => {
        load('TEMPERATURE', 'C', 20, 512);
        query('.head').click();
        fixture.detectChanges();

        const max = query('.end-max input') as HTMLInputElement;
        max.value = '200';
        max.dispatchEvent(new Event('change'));
        fixture.detectChanges();

        expect(scales.scaleFor(TEMPERATURE).max).toBe(200);
    });

    it('reads an emptied field as handing the end back to the data', () => {
        load('TEMPERATURE', 'C', 20, 512);
        scales.setEnd(TEMPERATURE, 'max', 200);
        query('.head').click();
        fixture.detectChanges();

        const max = query('.end-max input') as HTMLInputElement;
        max.value = '';
        max.dispatchEvent(new Event('change'));
        fixture.detectChanges();

        expect(scales.scaleFor(TEMPERATURE).max).toBe(512);
    });

    it('takes back a value the service refused, rather than leaving it standing', () => {
        load('TEMPERATURE', 'C', 20, 512);
        query('.head').click();
        fixture.detectChanges();

        // Below the bottom in force: the range would come out inside out.
        const max = query('.end-max input') as HTMLInputElement;
        max.value = '10';
        max.dispatchEvent(new Event('change'));
        fixture.detectChanges();

        expect(scales.scaleFor(TEMPERATURE).max).toBe(512);
        // The field must not keep answering with a number the scale does not use.
        expect(max.value).toBe('512');
    });

    it('shows a pinned end as the number that was typed, not a rounded one', () => {
        load('TEMPERATURE', 'C', 20, 999999);
        scales.setEnd(TEMPERATURE, 'max', 123456);
        query('.head').click();
        fixture.detectChanges();

        // Rounding the field would have the next edit of it submit 123000 -
        // the control would be quietly discarding the user's own number.
        expect((query('.end-max input') as HTMLInputElement).value).toBe('123456');
    });

    it('hands a chosen palette to the service', () => {
        load('TEMPERATURE', 'C', 20, 340);
        query('.head').click();
        fixture.detectChanges();

        const palette = query('.palette select') as HTMLSelectElement;
        palette.value = 'fire';
        palette.dispatchEvent(new Event('change'));
        fixture.detectChanges();

        expect(scales.scaleFor(TEMPERATURE).palette).toBe('fire');
    });

    it('empties itself when the scene goes', () => {
        load('TEMPERATURE', 'C', 20, 340);

        scales.resetSceneState();
        fixture.detectChanges();

        expect(query('.legend')).toBeNull();
    });
});
