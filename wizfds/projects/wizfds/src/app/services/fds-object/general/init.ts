import { IdGeneratorService } from "../../id-generator/id-generator.service";
import { Xb } from "../primitives";
import { filter, get, isArray, map, toNumber } from "lodash";

export interface InitObject {
    id: string,
    uuid: string,
    xb: Xb,
    temperature: number,
    density: number,
    spec_id: string[],
    mass_fraction: number[],
    hrrpuv: number,
    cell_centered: boolean
}

/**
 * An &INIT - a region the simulation starts in a state other than ambient.
 *
 * A warm layer under a ceiling, a volume already full of smoke, a species at a
 * concentration. Without one, everything in a scenario begins at the ambient
 * conditions of &MISC, so anything else had to be finished by hand in the input
 * file.
 *
 * The attributes are the ones in `FdsEntities.init` that describe **the region
 * and the state it starts in**. FDS also lets an &INIT seed particles into that
 * region - `PART_ID`, `N_PARTICLES`, `MASS_PER_TIME`, `UVW` and the rest - which
 * is a different job for a different form, and only worth having once a &PART
 * can be picked. Left out deliberately rather than forgotten.
 *
 * `MASS_FRACTION` and `SPEC_ID` are arrays, as they are in FDS and in
 * `FdsEntities` - one region can start several species at once. The form offers
 * one, and one is what the serialiser writes correctly: `parseAmper()` joins a
 * `CharacterArray` into a single quoted string, where FDS wants `SPEC_ID(1:2)=`
 * for a second. Kept as arrays anyway, so that fixing the serialiser is the
 * only thing a second species needs.
 */
export class Init {

    private _id: string;
    private _uuid: string;
    private _xb: Xb;
    private _temperature: number;
    private _density: number;
    private _spec_id: string[];
    private _mass_fraction: number[];
    private _hrrpuv: number;
    private _cell_centered: boolean;

    constructor(jsonString: string) {

        let base: InitObject;
        base = <InitObject>JSON.parse(jsonString);

        let idGeneratorService = new IdGeneratorService;

        this.id = get(base, 'id', '');
        this.uuid = get(base, 'uuid') || idGeneratorService.genUUID();
        this.xb = new Xb(JSON.stringify(get(base, 'xb', {})));
        this.temperature = this.numberOrUnset(get(base, 'temperature'));
        this.density = this.numberOrUnset(get(base, 'density'));
        this.spec_id = this.list(get(base, 'spec_id'));
        this.mass_fraction = map(this.list(get(base, 'mass_fraction')), toNumber);
        this.hrrpuv = this.numberOrUnset(get(base, 'hrrpuv'));
        this.cell_centered = get(base, 'cell_centered', false);
    }

    /**
     * A number the user gave, or nothing at all.
     *
     * FDS has a default for each of these - ambient temperature, ambient
     * density - and `parseAmper()` drops an empty value rather than writing it,
     * which is what keeps an &INIT from pinning a field to a number nobody
     * chose. So "not set" has to survive as something other than zero.
     */
    private numberOrUnset(value: any): number {
        return value === undefined || value === null || value === '' ? undefined : toNumber(value);
    }

    /**
     * One of the array-valued attributes, however it was stored.
     *
     * A scalar is accepted and wrapped: `SPEC_ID` reached this class as a plain
     * string while the form offered one species, and a stored scenario keeps
     * whatever shape it was saved in.
     */
    private list(value: any): any[] {
        if (value === undefined || value === null || value === '') { return []; }
        return isArray(value) ? filter(value, (item) => item !== '' && item !== null) : [value];
    }

    /**
     * A value `parseAmper()` will write, or the empty string it drops.
     *
     * Everything on an &INIT is optional and FDS defaults it to ambient, so an
     * attribute nobody set must not reach the input file at all. The serialiser
     * decides that on `value === ''` alone - `undefined` goes straight through
     * and lands in the file as the word "undefined".
     */
    private written(value: any): any {
        if (value === undefined || value === null) { return ''; }
        if (isArray(value) && value.length === 0) { return ''; }
        return value;
    }

    /**
     * Getter id
     * @return {string}
     */
	public get id(): string {
		return this._id;
	}

    /**
     * Setter id
     * @param {string} value
     */
	public set id(value: string) {
		this._id = value;
	}

    /**
     * Getter uuid
     * @return {string}
     */
	public get uuid(): string {
		return this._uuid;
	}

    /**
     * Setter uuid
     * @param {string} value
     */
	public set uuid(value: string) {
		this._uuid = value;
	}

    /**
     * Getter xb
     * @return {Xb}
     */
	public get xb(): Xb {
		return this._xb;
	}

    /**
     * Setter xb
     * @param {Xb} value
     */
	public set xb(value: Xb) {
		this._xb = value;
	}

    /**
     * Getter temperature
     * @return {number}
     */
	public get temperature(): number {
		return this._temperature;
	}

    /**
     * Setter temperature
     * @param {number} value
     */
	public set temperature(value: number) {
		this._temperature = value;
	}

    /**
     * Getter density
     * @return {number}
     */
	public get density(): number {
		return this._density;
	}

    /**
     * Setter density
     * @param {number} value
     */
	public set density(value: number) {
		this._density = value;
	}

    /**
     * Getter spec_id
     * @return {string[]}
     */
	public get spec_id(): string[] {
		return this._spec_id;
	}

    /**
     * Setter spec_id
     * @param {string[]} value
     */
	public set spec_id(value: string[]) {
		this._spec_id = value;
	}

    /**
     * Getter mass_fraction
     * @return {number[]}
     */
	public get mass_fraction(): number[] {
		return this._mass_fraction;
	}

    /**
     * Setter mass_fraction
     * @param {number[]} value
     */
	public set mass_fraction(value: number[]) {
		this._mass_fraction = value;
	}

    /**
     * Getter hrrpuv
     * @return {number}
     */
	public get hrrpuv(): number {
		return this._hrrpuv;
	}

    /**
     * Setter hrrpuv
     * @param {number} value
     */
	public set hrrpuv(value: number) {
		this._hrrpuv = value;
	}

    /**
     * Getter cell_centered
     * @return {boolean}
     */
	public get cell_centered(): boolean {
		return this._cell_centered;
	}

    /**
     * Setter cell_centered
     * @param {boolean} value
     */
	public set cell_centered(value: boolean) {
		this._cell_centered = value;
	}

    /** Export to json */
    public toJSON(): object {
        let init: object = {
            id: this.id,
            uuid: this.uuid,
            xb: this.xb.toJSON(),
            temperature: this.written(this.temperature),
            density: this.written(this.density),
            spec_id: this.written(this.spec_id),
            mass_fraction: this.written(this.mass_fraction),
            hrrpuv: this.written(this.hrrpuv),
            cell_centered: this.cell_centered
        }
        return init;
    }
}
