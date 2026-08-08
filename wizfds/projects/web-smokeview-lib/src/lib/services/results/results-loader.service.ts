import { Injectable } from '@angular/core';

import { QuantityGroup } from './quantity-groups';
import { SmvResultKind } from '../parsers/smv/smv-file';
import { ResultsDirectory } from './results-directory';
import { SmvFile } from '../parsers/smv/smv-file';
import { SliceService } from '../drawing/slice/slice.service';
import { BndfService } from '../drawing/bndf/bndf.service';
import { TimelineService } from '../timeline/timeline.service';
import { QuantityScaleService } from '../scale/quantity-scale.service';

/**
 * What every results format offers the panel that lists them.
 *
 * The same five questions whatever the bytes look like: which case we are in,
 * whether this group can be opened, whether it is open or opening, and open or
 * close it.
 */
export interface ResultFormatReader {
    setCase(smv: SmvFile, directory: ResultsDirectory): void;
    canLoad(group: QuantityGroup): boolean;
    isLoaded(group: QuantityGroup): boolean;
    isLoading(group: QuantityGroup): boolean;
    toggleGroup(group: QuantityGroup): Promise<void>;
}

/**
 * The one thing a host talks to about loading results (ADR-0021).
 *
 * Before this, both hosts named SliceService directly and asked
 * `isLoadableSliceGroup` themselves, which worked while there was one format
 * and would have become a switch per host at every new one (#152...#155). The
 * routing is domain logic - which reader owns which bytes - so it belongs in
 * the library; the wording and the icons stay with the hosts (ADR-0010).
 *
 * Opening a case is settled here too. It resets the timeline and the range, the
 * two things that are about *this* simulation and mean nothing in the next one.
 * Those calls used to sit in SliceService.setCase(), where a second format
 * would have repeated them - and a repeat mid-session rewinds the clock under
 * the user's hand (ADR-0018, ADR-0019).
 *
 * The readers are injected rather than registering themselves, unlike the
 * timeline and scale clients: once the hosts stop naming them, nothing else
 * would cause Angular to build them, and a reader that has never been
 * constructed has registered with nothing.
 */
@Injectable({
    providedIn: 'root'
})
export class ResultsLoaderService {

    /**
     * Which reader owns which format - the one place that lists them.
     *
     * A map rather than a switch and a parallel array, so that adding a format
     * cannot half-happen: routing a group and telling every reader about a new
     * case read the same entries.
     */
    private readonly readers: ReadonlyMap<SmvResultKind, ResultFormatReader>;

    constructor(
        slices: SliceService,
        boundaries: BndfService,
        private timeline: TimelineService,
        private scales: QuantityScaleService
    ) {
        // PRT5 (#153), SMOKE3D (#154) and ISOF (#155) are listed by the catalog
        // and have no reader yet; a group of one is simply not loadable, which
        // is what the panel already draws.
        this.readers = new Map<SmvResultKind, ResultFormatReader>([
            ['slcf', slices],
            ['bndf', boundaries]
        ]);
    }

    /**
     * A different case is being opened: every reader drops what it holds, and
     * the shared state that belonged to the previous simulation goes with it.
     */
    public setCase(smv: SmvFile, directory: ResultsDirectory): void {
        this.readers.forEach(reader => reader.setCase(smv, directory));
        // Another simulation: a position from the previous one means nothing
        // here, and neither does a range someone cut to fit the last one.
        this.timeline.resetForNewCase();
        this.scales.resetForNewCase();
    }

    public canLoad(group: QuantityGroup): boolean {
        return this.readerFor(group)?.canLoad(group) ?? false;
    }

    public isLoaded(group: QuantityGroup): boolean {
        return this.readerFor(group)?.isLoaded(group) ?? false;
    }

    public isLoading(group: QuantityGroup): boolean {
        return this.readerFor(group)?.isLoading(group) ?? false;
    }

    /** Load the group, or - loaded already - put it away. The panel's click. */
    public toggle(group: QuantityGroup): void {
        void this.readerFor(group)?.toggleGroup(group);
    }

    /**
     * Which reader owns this group, or null for a format with none yet.
     *
     * The group's files all share a kind - `groupResults()` keys on it - so the
     * first one answers for the group.
     */
    private readerFor(group: QuantityGroup): ResultFormatReader | null {
        const kind = group.files[0]?.kind;
        return (kind && this.readers.get(kind)) || null;
    }
}
