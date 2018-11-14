import { IdGeneratorService } from '../../id-generator/id-generator.service';
import { Xb } from '../primitives';
import { FdsEntities } from '../../../enums/fds/entities/fds-entities';
import { get, map, toNumber } from 'lodash';
import { Spec } from '../specie/spec';

export interface PartInterface {
    id: string,
    uuid: string,
    idAC: number,
    diameter: number,
    massless: boolean,
    sampling_factor: number,
    turbulent_dispersion: boolean,
    spec: boolean,
    specs: Spec[],
    initial_temperature: number
}
export class Part {
    private _id: string;
    private _uuid: string;
    private _diameter: number;
    private _massless: boolean;
    private _sampling_factor: number;
    private _turbulent_dispersion: boolean;
    private _spec: boolean;
    private _specs: Spec[];
    private _initial_temperature: number;

    constructor(jsonString: string) {

        let base: PartInterface;
        base = <PartInterface>JSON.parse(jsonString);

        let idGeneratorService = new IdGeneratorService;

        let part = FdsEntities.part;

        this.id = base.id || '';
        this.uuid = base.uuid || idGeneratorService.genUUID();
        this.diameter = get(base, 'diameter', part.diameter.default[0]);

        // massles particles
        this.massless = (get(base, 'massless', true) == true);
        this.sampling_factor = get(base, 'sampling_factor', part.sampling_factor.default[0]);
        this.turbulent_dispersion = (get(base, 'turbulent_dispersion', true) == true);


        // specs - after evaporation - must be liquid yes from table
        this.spec = (get(base, 'spec', true) == true);
        this.specs = this.spec && base.specs != undefined && base.specs.length > 0 ? map(base.specs, function(o) { return new Spec(JSON.stringify(o)) }) : [];

        // default from tmpa -> misc line
        this.initial_temperature = toNumber(get(base, 'initial_temperature', part.initial_temperature.default[0]));

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
     * Getter diameter
     * @return {number}
     */
    public get diameter(): number {
        return this._diameter;
    }

    /**
     * Setter diameter
     * @param {number} value
     */
    public set diameter(value: number) {
        this._diameter = value;
    }

    /**
     * Getter massless
     * @return {boolean}
     */
	public get massless(): boolean {
		return this._massless;
	}

    /**
     * Setter massless
     * @param {boolean} value
     */
	public set massless(value: boolean) {
		this._massless = value;
	}

    /**
     * Getter sampling_factor
     * @return {number}
     */
	public get sampling_factor(): number {
		return this._sampling_factor;
	}

    /**
     * Setter sampling_factor
     * @param {number} value
     */
	public set sampling_factor(value: number) {
		this._sampling_factor = value;
    }

    /**
     * Getter turbulent_dispersion
     * @return {boolean}
     */
	public get turbulent_dispersion(): boolean {
		return this._turbulent_dispersion;
	}

    /**
     * Setter turbulent_dispersion
     * @param {boolean} value
     */
	public set turbulent_dispersion(value: boolean) {
		this._turbulent_dispersion = value;
	}

    /**
     * Getter spec
     * @return {boolean}
     */
	public get spec(): boolean {
		return this._spec;
	}

    /**
     * Setter spec
     * @param {boolean} value
     */
	public set spec(value: boolean) {
		this._spec = value;
	}

    /**
     * Getter specs
     * @return {Spec[]}
     */
	public get specs(): Spec[] {
		return this._specs;
	}

    /**
     * Setter specs
     * @param {Spec[]} value
     */
	public set specs(value: Spec[]) {
		this._specs = value;
	}

    /**
     * Getter initial_temperature
     * @return {number}
     */
	public get initial_temperature(): number {
		return this._initial_temperature;
	}

    /**
     * Setter initial_temperature
     * @param {number} value
     */
	public set initial_temperature(value: number) {
		this._initial_temperature = value;
	}
    


    public toJSON(): object {
        let part = {
            id: this.id,
            uuid: this.uuid,
            diameter: this.diameter
        }
        return part;
    }


}
