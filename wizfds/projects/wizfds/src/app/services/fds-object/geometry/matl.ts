import { Xb } from '../primitives';
import { IdGeneratorService } from '../../../services/id-generator/id-generator.service'
import { FdsEntities } from '../../../enums/fds/entities/fds-entities'
import { Ramp } from '../ramp/ramp';
import { toNumber, get, set, find } from 'lodash';

export interface MatlObject {
	id: string,
	uuid: string,
	density: number,
	conductivity: number,
	conductivity_ramp: string,
	specific_heat: number,
	specific_heat_ramp: string,
	emissivity: number,
	absorption_coefficient: number
}

export class Matl {
	private _id: string;
	private _uuid: string;
	private _density: number;
	private _conductivity: number;
	private _conductivity_ramp: Ramp;
	private _specific_heat: number;
	private _specific_heat_ramp: Ramp;
	private _emissivity: number;
	private _absorption_coefficient: number;

	constructor(jsonString: string, ramps: Ramp[]) {

		let base: MatlObject;
		base = <MatlObject>JSON.parse(jsonString);

		let idGeneratorService = new IdGeneratorService;
		let matl = FdsEntities.matl;

		this.id = base.id || '';
		this.uuid = base.uuid || idGeneratorService.genUUID();

		this.density = toNumber(get(base, 'density', matl.density.default[0]));

		this.conductivity = toNumber(get(base, 'conductivity', matl.conductivity.default[0]));
		ramps && base.conductivity_ramp != undefined ? this.conductivity_ramp = find(ramps, function (ramp) { return ramp.id == base.conductivity_ramp; }) : this.conductivity_ramp = undefined;

		this.specific_heat = toNumber(get(base, 'specific_heat', matl.specific_heat.default[0]));
		ramps && base.specific_heat_ramp != undefined ? this.specific_heat_ramp = find(ramps, function (ramp) { return ramp.id == base.specific_heat_ramp; }) : this.specific_heat_ramp = undefined;

		this.emissivity = toNumber(get(base, 'emissivity', matl.emissivity.default[0]));
		this.absorption_coefficient = toNumber(get(base, 'absorption_coefficient', matl.absorption_coefficient.default[0]));
	}

	public get id(): string {
		return this._id;
	}

	public set id(value: string) {
		this._id = value;
	}

	public get uuid(): string {
		return this._uuid;
	}

	public set uuid(value: string) {
		this._uuid = value;
	}

	public get density(): number {
		return this._density;
	}

	public set density(value: number) {
		this._density = value;
	}

	public get conductivity(): number {
		return this._conductivity;
	}

	public set conductivity(value: number) {
		this._conductivity = value;
	}

	public get conductivity_ramp(): Ramp {
		return this._conductivity_ramp;
	}

	public set conductivity_ramp(value: Ramp) {
		this._conductivity_ramp = value;
	}

	public get specific_heat(): number {
		return this._specific_heat;
	}

	public set specific_heat(value: number) {
		this._specific_heat = value;
	}

	public get specific_heat_ramp(): Ramp {
		return this._specific_heat_ramp;
	}

	public set specific_heat_ramp(value: Ramp) {
		this._specific_heat_ramp = value;
	}

	public get emissivity(): number {
		return this._emissivity;
	}

	public set emissivity(value: number) {
		this._emissivity = value;
	}

	public get absorption_coefficient(): number {
		return this._absorption_coefficient;
	}

	public set absorption_coefficient(value: number) {
		this._absorption_coefficient = value;
	}

	toJSON(): object {
        let conductivity_ramp;
		this.conductivity_ramp == undefined ? conductivity_ramp = '' : conductivity_ramp = this.conductivity_ramp.id;

        let specific_heat_ramp;
		this.specific_heat_ramp == undefined ? specific_heat_ramp = '' : specific_heat_ramp = this.specific_heat_ramp.id;

		let matl: object = {
			id: this.id,
			uuid: this.uuid,
			density: this.density,
			conductivity: this.conductivity,
			conductivity_ramp: conductivity_ramp,
			specific_heat: this.specific_heat,
			specific_heat_ramp: specific_heat_ramp,
			emissivity: this.emissivity,
			absorption_coefficient: this.absorption_coefficient
		}
		return matl;
	}
}
