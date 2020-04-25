import { FdsEntities } from '@enums/fds/entities/fds-entities';
import { IdGeneratorService } from '@services/id-generator/id-generator.service';
import { Ramp } from '../ramp/ramp';
import { get, toString, toNumber, find, map } from 'lodash';
import { Spec } from './spec';
import { Color } from '../primitives';

export interface IMassFlux {
    spec: Spec,
    mass_flux: number
}

export interface IMassFraction {
    spec: Spec,
    mass_fraction: number
}

export interface ISurfSpec {
    id: string,
    uuid: string,
    idAC: number,
    color: Color,
    transparency: number,
    ramp: Ramp,
    ramp_id: any,
    specieFlowType: string,
    specieMassFractionFlowType: string,
    massFlux: IMassFlux[],
    massFraction: IMassFraction[],
    vel: number,
    volume_flow: number,
    mass_flux_total: number
}

export class SurfSpec {
    private _id: string;
    private _uuid: string;
    private _idAC: number;
    private _color: Color;
    private _transparency: number;
    private _ramp: Ramp;
    private _specieFlowType: string;
    private _specieMassFractionFlowType: string;
    private _massFlux: IMassFlux[];
    private _massFraction: IMassFraction[];
    private _vel: number;
    private _volume_flow: number;
    private _mass_flux_total: number;

    constructor(jsonString: string, ramps: Ramp[], specs: Spec[]) {

        let base: ISurfSpec;
        base = <ISurfSpec>JSON.parse(jsonString);

        let idGeneratorService = new IdGeneratorService;

        let surf = FdsEntities.surf;

        this.id = base.id || '';
        this.uuid = base.uuid || idGeneratorService.genUUID();
        this.idAC = base.idAC || 0;
        this.color = base.color != undefined && typeof base.color === 'object' ? new Color(JSON.stringify(base.color)) : new Color(JSON.stringify('{}'), 'DARK ORANGE');
        this.transparency = toNumber(get(base, 'transparency', surf.transparency.default[0]));

        this.specieFlowType = toString(get(base, 'specieFlowType', 'massFlux'));
        this.specieMassFractionFlowType = toString(get(base, 'specieMassFractionFlowType', 'volumeFlow'));

        this.vel = toNumber(get(base, 'vel', surf.vel.default));
        this.volume_flow = toNumber(get(base, 'volume_flow', surf.volume_flow.default));
        this.mass_flux_total = toNumber(get(base, 'mass_flux_total', surf.mass_flux_total.default));

        this.ramp = ramps && base.ramp_id != '' ? find(ramps, function (ramp: Ramp) { return ramp.id == base.ramp_id; }) : undefined;

        this.massFlux = base.massFlux != undefined && base.massFlux.length > 0 ? map(base.massFlux, (massFlux) => {
            if (massFlux['spec_id'] != undefined && massFlux['spec_id'] != '') {
                let spec = <Spec> find(specs, function (o: Spec) { return o.id == massFlux['spec_id'] });
                return { spec: spec, mass_flux: massFlux.mass_flux }
            }
        }) : [];
        this.massFraction = base.massFraction != undefined && base.massFraction.length > 0 ? map(base.massFraction, (massFraction) => {
            if (massFraction['spec_id'] != undefined && massFraction['spec_id'] != '') {
                let spec = <Spec>find(specs, function (o: Spec) { return o.id == massFraction['spec_id'] });
                return { spec: spec, mass_fraction: massFraction.mass_fraction }
            }
        }) : [];
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
     * Getter idAC
     * @return {number}
     */
    public get idAC(): number {
        return this._idAC;
    }

    /**
     * Setter idAC
     * @param {number} value
     */
    public set idAC(value: number) {
        this._idAC = value;
    }

    /**
     * Getter color
     * @return {Color}
     */
	public get color(): Color {
		return this._color;
	}

    /**
     * Setter color
     * @param {Color} value
     */
	public set color(value: Color) {
		this._color = value;
	}

    /**
     * Getter transparency
     * @return {number}
     */
    public get transparency(): number {
        return this._transparency;
    }

    /**
     * Setter transparency
     * @param {number} value
     */
    public set transparency(value: number) {
        this._transparency = value;
    }

    /**
     * Getter ramp
     * @return {Ramp}
     */
    public get ramp(): Ramp {
        return this._ramp;
    }

    /**
     * Setter ramp
     * @param {Ramp} value
     */
    public set ramp(value: Ramp) {
        this._ramp = value;
    }

    /**
     * Getter specieFlowType
     * @return {string}
     */
    public get specieFlowType(): string {
        return this._specieFlowType;
    }

    /**
     * Setter specieFlowType
     * @param {string} value
     */
    public set specieFlowType(value: string) {
        this._specieFlowType = value;
    }

    /**
     * Getter massFlux
     * @return {IMassFlux[]}
     */
    public get massFlux(): IMassFlux[] {
        return this._massFlux;
    }

    /**
     * Setter massFlux
     * @param {IMassFlux[]} value
     */
    public set massFlux(value: IMassFlux[]) {
        this._massFlux = value;
    }

    /**
     * Getter massFraction
     * @return {IMassFraction[]}
     */
    public get massFraction(): IMassFraction[] {
        return this._massFraction;
    }

    /**
     * Setter massFraction
     * @param {IMassFraction[]} value
     */
    public set massFraction(value: IMassFraction[]) {
        this._massFraction = value;
    }

    /**
     * Getter specieMassFractionFlowType
     * @return {string}
     */
    public get specieMassFractionFlowType(): string {
        return this._specieMassFractionFlowType;
    }

    /**
     * Setter specieMassFractionFlowType
     * @param {string} value
     */
    public set specieMassFractionFlowType(value: string) {
        this._specieMassFractionFlowType = value;
    }

    /**
     * Getter vel
     * @return {number}
     */
	public get vel(): number {
		return this._vel;
	}

    /**
     * Setter vel
     * @param {number} value
     */
	public set vel(value: number) {
		this._vel = value;
	}

    /**
     * Getter volume_flow
     * @return {number}
     */
	public get volume_flow(): number {
		return this._volume_flow;
	}

    /**
     * Setter volume_flow
     * @param {number} value
     */
	public set volume_flow(value: number) {
		this._volume_flow = value;
	}

    /**
     * Getter mass_flux_total
     * @return {number}
     */
	public get mass_flux_total(): number {
		return this._mass_flux_total;
	}

    /**
     * Setter mass_flux_total
     * @param {number} value
     */
	public set mass_flux_total(value: number) {
		this._mass_flux_total = value;
	}

    /**
     * Export to JSON
     */
    public toJSON() {
        let ramp_id;
        this.ramp == undefined ? ramp_id = '' : ramp_id = this.ramp.id;

        let massFlux = map(this.massFlux, function (o: IMassFlux) {
            return { spec_id: o.spec.id, mass_flux: o.mass_flux }
        });

        let massFraction = map(this.massFraction, function (o: IMassFraction) {
            return { spec_id: o.spec.id, mass_fraction: o.mass_fraction }
        });

        let surf = {
            id: this.id,
            uuid: this.uuid,
            idAC: this.idAC,
            color: this.color,
            ramp_id: ramp_id,
            ramp_mf: ramp_id,
            specieFlowType: this.specieFlowType,
            specieMassFractionFlowType: this.specieMassFractionFlowType,
            massFlux: massFlux,
            massFraction: massFraction,
            vel: this.vel,
            volume_flow: this.volume_flow,
            mass_flux_total: this.mass_flux_total
        }
        return surf;
    }
}
