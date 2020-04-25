import { Xb, Color } from '../primitives';
import { FdsEntities } from '@enums/fds/entities/fds-entities';
import { IdGeneratorService } from '@services/id-generator/id-generator.service';
import { Ramp } from '../ramp/ramp';
import { find, get, toNumber, toString, round } from 'lodash';

export interface IAreaJetFan {
    type: string,
    oldType: string,
    area: number,
    diameter: number,
    perimeter: number
}
export interface IHeaterJetFan {
    active: boolean,
    tmp_front: number
}
export interface IDevcJetFan {
    active: boolean,
    setpoint: number
}
export interface ILouverJetFan {
    active: boolean,
    tangential1: number,
    tangential2: number,
    tangential3: number
}
export interface IJetFan {
    id: string,
    uuid: string,
    idAC: number,
    color: Color,
    transparency: number,
    elevation: number,
    xb: Xb,
    flow: {
        type: string,
        oldType: string,
        volume_flow: number,
        volume_flow_per_hour: number,
        mass_flow: number,
        velocity: number
    },
    heater: IHeaterJetFan,
    louver: ILouverJetFan,
    ramp: Ramp,
    ramp_id: any,
    direction: string
    devc: IDevcJetFan
}

export class JetFan {
    private _id: string;
    private _uuid: string;
    private _idAC: number;
    private _color: Color;
    private _transparency: number;
    private _elevation: number;
    private _xb: Xb;
    private _flow: any;
    private _heater: IHeaterJetFan;
    private _louver: ILouverJetFan;
    private _ramp: Ramp;
    private _direction: string;
    private _area: IAreaJetFan;
    private _devc: IDevcJetFan;

    constructor(jsonString: string, ramps: Ramp[]) {

        let base: IJetFan;
        base = <IJetFan>JSON.parse(jsonString);

        let idGeneratorService = new IdGeneratorService;

        let surf = FdsEntities.surf;
        let vent = FdsEntities.vent;
        let hvac = FdsEntities.hvac;
        let devc = FdsEntities.devc;

        this.id = base.id || '';
        this.uuid = base.uuid || idGeneratorService.genUUID();
        this.idAC = base.idAC || 0;
        this.color = base.color != undefined && typeof base.color === 'object' ? new Color(JSON.stringify(base.color)) : new Color(JSON.stringify('{}'), 'COLD GREY');
        this.transparency = toNumber(get(base, 'transparency', surf.transparency.default));

        this.xb = new Xb(JSON.stringify(base.xb)) || new Xb(JSON.stringify({}));

        this.flow = {
            type: get(base, 'flow.type', 'volumeFlow'),
            oldType: 'volumeFlow',
            volume_flow: toNumber(get(base, 'flow.volume_flow', surf.volume_flow.default)),
            volume_flow_per_hour: toNumber(get(base, 'flow.volume_flow_per_hour', surf.volume_flow.default * 3600)),
            mass_flow: toNumber(get(base, 'flow.mass_flow', surf.mass_flux.default)),
            velocity: toNumber(get(base, 'flow.velocity', surf.vel.default))
        }

        this.heater = {
            active: (get(base, 'heater.active', false) == true),
            tmp_front: toNumber(get(base, 'heater.tmp_front', surf.tmp_front.default)),
        }

        this.direction = get(base, 'direction', '+x');

        this.louver = {
            active: (get(base, 'louver.active', false) == true),
            tangential1: toNumber(get(base, 'louver.tangential1', surf.vel_t.default[0])),
            tangential2: toNumber(get(base, 'louver.tangential2', surf.vel_t.default[1])),
            tangential3: toNumber(get(base, 'louver.tangential3', surf.vel_t.default[1]))
        }

        this.area = {
            type: get(base, 'area.type', 'area'),
            oldType: 'area',
            area: toNumber(get(base, 'area.area', hvac.area.default[0])),
            diameter: toNumber(get(base, 'area.diameter', hvac.diameter.default[0])),
            perimeter: toNumber(get(base, 'area.perimeter', hvac.perimeter.default[0]))
        }

        this.devc = {
            active: (get(base, 'devc.active', false) == true),
            setpoint: toNumber(get(base, 'devc.setpoint', devc.setpoint.default[0]))
        }

        ramps && base.ramp_id != '' ? this.ramp = find(ramps, function (ramp) { return ramp.id == base.ramp_id; }) : this.ramp = undefined;

    }

    /** Desc ... */
    changeAreaType() {
        if (this.area['type'] == 'area') {
            this.area['area'] = 0;
        } else if (this.area['type'] == 'diameter') {
            this.area['diameter'] = 0;
        } else if (this.area['type'] == 'perimeter') {
            this.area['perimeter'] = 0;
        }
    }

    /** Desc ... */
    public changeFlowType() {

        if (this.flow.type == 'velocity') {
            if (this.flow.oldType == 'volumeFlow') {

            } else if (this.flow.oldType == 'massFlow') {

            }
            this.flow.volume_flow = 0;
            this.flow.mass_flow = 0;

        } else if (this.flow.type == 'volumeFlow') {
            if (this.flow.oldType == 'velocity') {

            } else if (this.flow.oldType == 'massFlow') {

            }
            this.flow.velocity = 0;
            this.flow.mass_flow = 0;

        } else if (this.flow.type == 'massFlow') {
            if (this.flow.oldType == 'velocity') {

            } else if (this.flow.oldType == 'massFlow') {

            }
            this.flow.volume_flow = 0;
            this.flow.mass_flow = 0;
        }
    }

    /** Recalculate volume flow */
    public calcVolumeFlow(event: any, perHour?: boolean) {
        if (perHour) {
            this.flow.volume_flow = event;
            this.flow.volume_flow_per_hour = this.flow.volume_flow * 3600
        }
        else {
            this.flow.volume_flow_per_hour = event;
            this.flow.volume_flow = round(this.flow.volume_flow_per_hour / 3600, 4);
        }
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
     * Getter elevation
     * @return {number}
     */
    public get elevation(): number {
        return this._elevation;
    }

    /**
     * Setter elevation
     * @param {number} value
     */
    public set elevation(value: number) {
        this._elevation = value;
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
     * Getter flow
     * @return {any}
     */
    public get flow(): any {
        return this._flow;
    }

    /**
     * Setter flow
     * @param {any} value
     */
    public set flow(value: any) {
        this._flow = value;
    }

    /**
     * Getter heater
     * @return {IHeaterJetFan}
     */
	public get heater(): IHeaterJetFan {
		return this._heater;
	}

    /**
     * Setter heater
     * @param {IHeaterJetFan} value
     */
	public set heater(value: IHeaterJetFan) {
		this._heater = value;
	}

    /**
     * Getter louver
     * @return {ILouverJetFan}
     */
	public get louver(): ILouverJetFan {
		return this._louver;
	}

    /**
     * Setter louver
     * @param {ILouverJetFan} value
     */
	public set louver(value: ILouverJetFan) {
		this._louver = value;
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
     * Getter direction
     * @return {string}
     */
    public get direction(): string {
        return this._direction;
    }

    /**
     * Setter direction
     * @param {string} value
     */
    public set direction(value: string) {
        this._direction = value;
    }

    /**
     * Getter area
     * @return {IAreaJetFan}
     */
	public get area(): IAreaJetFan {
		return this._area;
	}

    /**
     * Setter area
     * @param {IAreaJetFan} value
     */
	public set area(value: IAreaJetFan) {
		this._area = value;
	}

    /**
     * Getter devc
     * @return {IDevcJetFan}
     */
	public get devc(): IDevcJetFan {
		return this._devc;
	}

    /**
     * Setter devc
     * @param {IDevcJetFan} value
     */
	public set devc(value: IDevcJetFan) {
		this._devc = value;
	}

    /** Export to JSON */
    public toJSON() {
        var flow = {};

        if (this.flow.type == 'velocity') {
            flow = {
                type: 'velocity',
                velocity: this.flow.velocity
            }
        } else if (this.flow.type == 'volumeFlow') {
            flow = {
                type: 'volumeFlow',
                volume_flow: this.flow.volume_flow,
                volume_flow_per_hour: this.flow.volume_flow_per_hour
            }

        } else if (this.flow.type == 'massFlow') {
            flow = {
                type: 'massFlow',
                mass_flow: this.flow.mass_flow
            }

        } else {
            flow = {};
        }

        var area = {};
        if (this.area['type'] == 'area') {
            area = {
                type: 'area',
                area: this.area['area']
            }
        } else if (this.area['type'] == 'diameter') {
            area = {
                type: 'diameter',
                diameter: this.area['diameter']
            }
        } else if (this.area['type'] == 'perimeter') {
            area = {
                type: 'perimeter',
                perimeter: this.area['perimeter']
            }
        } else {
            area = {};
        }

        let ramp_id;
        this.ramp == undefined ? ramp_id = '' : ramp_id = this.ramp['id'];

        let jetfan = {
            id: this.id,
            uuid: this.uuid,
            idAC: this.idAC,
            color: this.color,
            direction: this.direction,
            elevation: this.elevation,
            flow: flow,
            area: area,
            ramp_id: ramp_id,
            louver: {
                active: this.louver['active'],
                tangential1: this.louver['tangential1'],
                tangential2: this.louver['tangential2'],
                tangential3: this.louver['tangential3']
            },
            xb: this.xb.toJSON(),
            devc: {
                active: this.devc['active'],
                setpoint: this.devc['setpoint'],
            },
        }
        return jetfan;
    }
}
