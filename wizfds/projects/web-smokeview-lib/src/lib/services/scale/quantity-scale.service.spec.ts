import { TestBed } from '@angular/core/testing';

import {
    QuantityExtent, QuantityScale, QuantityScaleService, ScaleClient, quantityKey
} from './quantity-scale.service';

/**
 * The whole of "Zakres wielkości" (CONTEXT.md) except the two things that
 * cannot live here: which nodes a format counts as visible, which belongs to
 * the format (slice.service.spec), and what the scale looks like on screen
 * (quantity-legend.component.spec).
 *
 * Everything is driven through refresh(), never by reading a file - that is
 * what makes every rule below assertable without a scene or a `.sf`.
 */
describe('QuantityScaleService', () => {

    let service: QuantityScaleService;

    const TEMPERATURE = quantityKey({ label: 'TEMPERATURE', unit: 'C' });
    const VELOCITY = quantityKey({ label: 'VELOCITY', unit: 'm/s' });

    /** A format standing in for SliceService: what it holds, and what it was told. */
    class FakeClient implements ScaleClient {
        public held = new Map<string, QuantityExtent>();
        public applied: { quantity: string, scale: QuantityScale }[] = [];

        public quantityExtents(): ReadonlyMap<string, QuantityExtent> { return this.held; }
        public applyScale(quantity: string, scale: QuantityScale): void {
            this.applied.push({ quantity: quantity, scale: scale });
        }

        /** Load a group of this quantity, as toggleGroup() would. */
        public hold(label: string, unit: string, min: number, max: number): FakeClient {
            const quantity = { label: label, unit: unit };
            this.held.set(quantityKey(quantity),
                { quantity: quantity, min: min, max: max });
            return this;
        }

        public drop(key: string): FakeClient {
            this.held.delete(key);
            return this;
        }

        /** The last scale this client was told to draw the quantity with. */
        public last(quantity: string): QuantityScale | undefined {
            const applied = this.applied.filter(entry => entry.quantity === quantity);
            return applied.length ? applied[applied.length - 1].scale : undefined;
        }
    }

    /** Register a client already holding a quantity, and settle the scales. */
    const loaded = (label: string, unit: string, min: number, max: number): FakeClient => {
        const client = new FakeClient().hold(label, unit, min, max);
        service.register(client);
        service.refresh();
        return client;
    };

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(QuantityScaleService);
    });

    describe('identity', () => {

        it('is the quantity and its unit, so a position never splits a scale', () => {
            expect(quantityKey({ label: 'TEMPERATURE', unit: 'C' }))
                .toBe(quantityKey({ label: 'TEMPERATURE', unit: 'C' }));
        });

        it('separates two quantities that differ only in unit', () => {
            expect(quantityKey({ label: 'TEMPERATURE', unit: 'C' }))
                .not.toBe(quantityKey({ label: 'TEMPERATURE', unit: 'K' }));
        });
    });

    describe('the range', () => {

        it('does not exist before anything is loaded', () => {
            expect(service.all()).toEqual([]);
            expect(service.scaleFor(TEMPERATURE)).toBeNull();
        });

        it('spans what one client holds', () => {
            loaded('TEMPERATURE', 'C', 20, 340);

            expect(service.scaleFor(TEMPERATURE)).toEqual(
                jasmine.objectContaining({ min: 20, max: 340 }));
        });

        it('spans every client holding the quantity, whatever format they are', () => {
            loaded('TEMPERATURE', 'C', 20, 340);
            loaded('TEMPERATURE', 'C', 15, 512);

            expect(service.scaleFor(TEMPERATURE)).toEqual(
                jasmine.objectContaining({ min: 15, max: 512 }));
        });

        it('keeps two quantities apart', () => {
            loaded('TEMPERATURE', 'C', 20, 340);
            loaded('VELOCITY', 'm/s', -2, 12);

            expect(service.scaleFor(TEMPERATURE)).toEqual(
                jasmine.objectContaining({ min: 20, max: 340 }));
            expect(service.scaleFor(VELOCITY)).toEqual(
                jasmine.objectContaining({ min: -2, max: 12 }));
        });

        it('widens when a hotter group of the same quantity is loaded', () => {
            const client = loaded('TEMPERATURE', 'C', 20, 340);

            client.hold('TEMPERATURE', 'C', 20, 512);
            service.refresh();

            expect(service.scaleFor(TEMPERATURE).max).toBe(512);
        });

        it('narrows again when that group is unloaded', () => {
            const cool = loaded('TEMPERATURE', 'C', 20, 340);
            const hot = loaded('TEMPERATURE', 'C', 20, 512);

            hot.drop(TEMPERATURE);
            service.refresh();

            expect(service.scaleFor(TEMPERATURE).max).toBe(340);
            expect(cool.last(TEMPERATURE).max).toBe(340);
        });

        it('goes away with the last group holding it', () => {
            const client = loaded('TEMPERATURE', 'C', 20, 340);

            client.drop(TEMPERATURE);
            service.refresh();

            expect(service.scaleFor(TEMPERATURE)).toBeNull();
            expect(service.all()).toEqual([]);
        });

        it('tells every client the scale, not only the one that grew it', () => {
            const cool = loaded('TEMPERATURE', 'C', 20, 340);
            const hot = loaded('TEMPERATURE', 'C', 20, 512);

            expect(cool.last(TEMPERATURE).max).toBe(512);
            expect(hot.last(TEMPERATURE).max).toBe(512);
        });

        it('says nothing to a client about a quantity it does not hold', () => {
            const temperature = loaded('TEMPERATURE', 'C', 20, 340);
            loaded('VELOCITY', 'm/s', 0, 12);

            expect(temperature.last(VELOCITY)).toBeUndefined();
        });

        it('reports a constant field as the one value it is', () => {
            loaded('TEMPERATURE', 'C', 20, 20);

            expect(service.scaleFor(TEMPERATURE)).toEqual(
                jasmine.objectContaining({ min: 20, max: 20 }));
        });
    });

    describe('the manual ends', () => {

        it('replaces the end it names and leaves the other alone', () => {
            loaded('TEMPERATURE', 'C', 20, 512);

            service.setEnd(TEMPERATURE, 'max', 200);

            expect(service.scaleFor(TEMPERATURE)).toEqual(
                jasmine.objectContaining({ min: 20, max: 200 }));
        });

        it('keeps the end left on auto following the data', () => {
            const client = loaded('TEMPERATURE', 'C', 20, 340);
            service.setEnd(TEMPERATURE, 'max', 200);

            client.hold('TEMPERATURE', 'C', -5, 512);
            service.refresh();

            expect(service.scaleFor(TEMPERATURE)).toEqual(
                jasmine.objectContaining({ min: -5, max: 200 }));
        });

        it('reaches the clients without waiting for a load', () => {
            const client = loaded('TEMPERATURE', 'C', 20, 512);

            service.setEnd(TEMPERATURE, 'max', 200);

            expect(client.last(TEMPERATURE).max).toBe(200);
        });

        it('still reports what the data spans, so the legend can say it is cut off', () => {
            loaded('TEMPERATURE', 'C', 20, 512);

            service.setEnd(TEMPERATURE, 'max', 200);

            const view = service.all()[0];
            expect(view.scale.max).toBe(200);
            expect(view.extent.max).toBe(512);
            expect(view.maxOverride).toBe(200);
            expect(view.minOverride).toBeNull();
        });

        it('goes back to the data when cleared', () => {
            loaded('TEMPERATURE', 'C', 20, 512);
            service.setEnd(TEMPERATURE, 'max', 200);

            service.setEnd(TEMPERATURE, 'max', null);

            expect(service.scaleFor(TEMPERATURE).max).toBe(512);
            expect(service.all()[0].maxOverride).toBeNull();
        });

        it('survives the group being unloaded and loaded again', () => {
            const client = loaded('TEMPERATURE', 'C', 20, 512);
            service.setEnd(TEMPERATURE, 'max', 200);

            client.drop(TEMPERATURE);
            service.refresh();
            client.hold('TEMPERATURE', 'C', 20, 512);
            service.refresh();

            expect(service.scaleFor(TEMPERATURE).max).toBe(200);
        });

        it('refuses an end that would turn the range inside out', () => {
            loaded('TEMPERATURE', 'C', 20, 512);

            service.setEnd(TEMPERATURE, 'max', 20);
            expect(service.scaleFor(TEMPERATURE).max).toBe(512);

            service.setEnd(TEMPERATURE, 'min', 600);
            expect(service.scaleFor(TEMPERATURE).min).toBe(20);
        });

        it('refuses an end that is not a number', () => {
            loaded('TEMPERATURE', 'C', 20, 512);

            service.setEnd(TEMPERATURE, 'max', Number.NaN);

            expect(service.scaleFor(TEMPERATURE).max).toBe(512);
        });

        it('lets both ends be set together, against each other rather than the data', () => {
            loaded('TEMPERATURE', 'C', 20, 512);

            service.setEnd(TEMPERATURE, 'min', 100);
            service.setEnd(TEMPERATURE, 'max', 200);

            expect(service.scaleFor(TEMPERATURE)).toEqual(
                jasmine.objectContaining({ min: 100, max: 200 }));
        });
    });

    describe('the palette', () => {

        it('is SmokeView\'s default until something else is chosen', () => {
            loaded('TEMPERATURE', 'C', 20, 340);

            expect(service.scaleFor(TEMPERATURE).colorbar).toBe('Rainbow');
        });

        it('belongs to the quantity, not to the scene', () => {
            loaded('TEMPERATURE', 'C', 20, 340);
            loaded('VELOCITY', 'm/s', 0, 12);

            service.setPalette(TEMPERATURE, 'fire');

            expect(service.scaleFor(TEMPERATURE).colorbar).toBe('fire');
            expect(service.scaleFor(VELOCITY).colorbar).toBe('Rainbow');
        });

        it('reaches the clients as the ends do', () => {
            const client = loaded('TEMPERATURE', 'C', 20, 340);

            service.setPalette(TEMPERATURE, 'cool');

            expect(client.last(TEMPERATURE).colorbar).toBe('cool');
        });
    });

    describe('a different case', () => {

        it('takes back the ends and the palette the user set', () => {
            loaded('TEMPERATURE', 'C', 20, 512);
            service.setEnd(TEMPERATURE, 'max', 200);
            service.setPalette(TEMPERATURE, 'fire');

            service.resetForNewCase();

            expect(service.scaleFor(TEMPERATURE)).toEqual(
                jasmine.objectContaining({ min: 20, max: 512, colorbar: 'Rainbow' }));
        });

        it('leaves the clients registered, as the timeline does', () => {
            const client = loaded('TEMPERATURE', 'C', 20, 512);

            service.resetSceneState();
            service.refresh();

            expect(client.last(TEMPERATURE)).toBeDefined();
        });
    });
});
