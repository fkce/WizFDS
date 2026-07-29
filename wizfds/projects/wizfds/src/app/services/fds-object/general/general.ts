import { FdsEntities } from '../../../enums/fds/entities/fds-entities';
import { IdGeneratorService } from '../../id-generator/id-generator.service';
import { get, isEmpty, map, omit } from 'lodash';
import { Head } from './head';
import { Time } from './time';
import { Misc } from './misc';
import { Init } from './init';

export interface GeneralObject {
    head: Head,
    time: Time,
    misc: Misc,
    inits: Init[],
    /** What a scenario saved before &INIT became a list carries. See inits. */
    init?: Init
}

export class General {

    private _head: Head;
    private _time: Time;
    private _misc: Misc;
    private _inits: Init[];

    constructor(jsonString: string) {

        let base: GeneralObject;
        base = <GeneralObject>JSON.parse(jsonString);

        this.head = base.head != undefined ? new Head(JSON.stringify(base.head)) : new Head(JSON.stringify({}));
        this.time = base.time != undefined ? new Time(JSON.stringify(base.time)) : new Time(JSON.stringify({}));
        this.misc = base.misc != undefined ? new Misc(JSON.stringify(base.misc)) : new Misc(JSON.stringify({}));
        this.inits = this.readInits(base);
    }

    /**
     * The &INIT regions of a scenario, however it was saved.
     *
     * FDS allows many, and the model held exactly one - so every scenario saved
     * to date carries `general.init` rather than a list. That single object is
     * migrated rather than dropped, because a user who filled it in would
     * otherwise lose the region without being told.
     *
     * Almost all of them will be empty: the old `Init` was a stub that read
     * nothing and serialised to `{}`, so an empty object means "the stub was
     * here", not "a region with no values". Migrating those would give every
     * existing scenario a nameless &INIT it never asked for.
     */
    private readInits(base: GeneralObject): Init[] {
        const stored = get(base, 'inits');
        if (stored != undefined) {
            return map(stored, (init) => new Init(JSON.stringify(init)));
        }

        const single = get(base, 'init');
        // uuid alone is not a value the user entered - see Init's constructor
        if (single == undefined || isEmpty(omit(single, 'uuid'))) { return []; }

        return [new Init(JSON.stringify(single))];
    }

    /**
     * Getter head
     * @return {Head}
     */
	public get head(): Head {
		return this._head;
	}

    /**
     * Setter head
     * @param {Head} value
     */
	public set head(value: Head) {
		this._head = value;
	}

    /**
     * Getter time
     * @return {Time}
     */
	public get time(): Time {
		return this._time;
	}

    /**
     * Setter time
     * @param {Time} value
     */
	public set time(value: Time) {
		this._time = value;
	}


    /**
     * Getter misc
     * @return {Misc}
     */
	public get misc(): Misc {
		return this._misc;
	}

    /**
     * Setter misc
     * @param {Misc} value
     */
	public set misc(value: Misc) {
		this._misc = value;
	}

    /**
     * Getter inits
     * @return {Init[]}
     */
	public get inits(): Init[] {
		return this._inits;
	}

    /**
     * Setter inits
     * @param {Init[]} value
     */
	public set inits(value: Init[]) {
		this._inits = value;
	}

    /** Export to json */
    toJSON(): object {
        let general: object = {
            head: this.head.toJSON(),
            time: this.time.toJSON(),
            misc: this.misc.toJSON(),
            inits: map(this.inits, (init: Init) => init.toJSON())
        }
        return general;
    }

}
