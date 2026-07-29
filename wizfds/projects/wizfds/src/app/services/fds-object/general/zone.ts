import { IdGeneratorService } from "../../id-generator/id-generator.service";
import { FdsEntities } from "../../../enums/fds/entities/fds-entities";
import { Xb } from "../primitives";
import { get, toNumber } from "lodash";

export interface ZoneObject {
    id: string,
    uuid: string,
    xb: Xb,
    leak_area: number,
    periodic: boolean
}

/**
 * A &ZONE - a sealed pressure zone.
 *
 * A lift shaft, a stairwell, a room the smoke has to be kept out of. FDS solves
 * the pressure in each zone separately and lets neighbouring ones leak into
 * each other through `LEAK_AREA`, which is what makes a pressurisation system
 * modellable at all. WizFDS could not express one, so a scenario needing zones
 * had to be finished by hand in the `.fds` file.
 *
 * Both `LEAK_AREA` and `PERIODIC` have FDS defaults, so they are read from the
 * attribute table rather than left empty: a zone that leaks, or that wraps
 * around, is something the user asks for. That is the difference from &INIT,
 * where every field means "leave it at ambient" until it is filled in.
 */
export class Zone {

    private _id: string;
    private _uuid: string;
    private _xb: Xb;
    private _leak_area: number;
    private _periodic: boolean;

    constructor(jsonString: string) {

        let base: ZoneObject;
        base = <ZoneObject>JSON.parse(jsonString);

        let idGeneratorService = new IdGeneratorService;
        let zone = FdsEntities.zone;

        this.id = get(base, 'id', '');
        this.uuid = get(base, 'uuid') || idGeneratorService.genUUID();
        this.xb = new Xb(JSON.stringify(get(base, 'xb', {})));
        this.leak_area = toNumber(get(base, 'leak_area', zone.leak_area.default[0]));
        this.periodic = get(base, 'periodic', zone.periodic.default[0]);
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
     * Getter leak_area
     * @return {number}
     */
	public get leak_area(): number {
		return this._leak_area;
	}

    /**
     * Setter leak_area
     * @param {number} value
     */
	public set leak_area(value: number) {
		this._leak_area = value;
	}

    /**
     * Getter periodic
     * @return {boolean}
     */
	public get periodic(): boolean {
		return this._periodic;
	}

    /**
     * Setter periodic
     * @param {boolean} value
     */
	public set periodic(value: boolean) {
		this._periodic = value;
	}

    /** Export to json */
    public toJSON(): object {
        let zone: object = {
            id: this.id,
            uuid: this.uuid,
            xb: this.xb.toJSON(),
            leak_area: this.leak_area,
            periodic: this.periodic
        }
        return zone;
    }
}
