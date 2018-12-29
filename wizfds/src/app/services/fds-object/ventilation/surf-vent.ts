import { FdsEntities } from '@enums/fds/entities/fds-entities';
import { IdGeneratorService } from '@services/id-generator/id-generator.service';
import { Ramp } from '../ramp/ramp';
import { get, toString, toNumber, find, round } from 'lodash';

export interface ISurfVent {
    id: string,
    uuid: string,
    idAC: number,
    color: string,
    transparency: number,
    flow: any,
    tmp_front: number,
    isActiveHeater: boolean,
    vel_t: number[],
    isActiveLouver: boolean,
    ramp: Ramp,
    ramp_id: any
}

export class SurfVent {
    private _id: string;
    private _uuid: string;
    private _idAC: number;
    private _color: string;
    private _transparency: number;
    private _flow: any;
    private _tmp_front: number;
    private _isActiveHeater: boolean;
    private _vel_t: number[];
    private _isActiveLouver: boolean;
    private _ramp: Ramp;

    constructor(jsonString: string, ramps: Ramp[]) {

        let base: ISurfVent;
        base = <ISurfVent>JSON.parse(jsonString);

        let idGeneratorService = new IdGeneratorService;

        let surf = FdsEntities.surf;

        this.id = base.id || '';
        this.uuid = base.uuid || idGeneratorService.genUUID();
        this.idAC = base.idAC || 0;
        this.color = toString(get(base, 'color', surf.color.default[0]));
        this.transparency = toNumber(get(base, 'transparency', surf.transparency.default[0]));

        this.flow = {
            type: get(base, 'flow.type', 'velocity'),
            oldType: 'velocity',
            volume_flow: toNumber(get(base, 'flow.volume_flow', surf.volume_flow.default)),
            volume_flow_per_hour: toNumber(get(base, 'flow.volume_flow_per_hour', surf.volume_flow.default * 3600)),
            mass_flow: toNumber(get(base, 'flow.mass_flow', surf.mass_flux.default)),
            vel: toNumber(get(base, 'flow.vel', surf.vel.default))
        }

        this.isActiveHeater = (get(base, 'isActiveHeater', false) == true);
        this.tmp_front = toNumber(get(base, 'tmp_front', surf.tmp_front.default));

        this.isActiveLouver = (get(base, 'isActiveLouver', false) == true);
        this.vel_t = get(base, 'vel_t', surf.vel_t.default) as number[];

        ramps && base.ramp_id != '' ? this.ramp = find(ramps, function (ramp) { return ramp.id == base.ramp_id; }) : this.ramp = undefined;
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
     * @return {string}
     */
    public get color(): string {
        return this._color;
    }

    /**
     * Setter color
     * @param {string} value
     */
    public set color(value: string) {
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
     * Getter tmp_front
     * @return {number}
     */
    public get tmp_front(): number {
        return this._tmp_front;
    }

    /**
     * Setter tmp_front
     * @param {number} value
     */
    public set tmp_front(value: number) {
        this._tmp_front = value;
    }

    /**
     * Getter isActiveHeater
     * @return {boolean}
     */
    public get isActiveHeater(): boolean {
        return this._isActiveHeater;
    }

    /**
     * Setter isActiveHeater
     * @param {boolean} value
     */
    public set isActiveHeater(value: boolean) {
        this._isActiveHeater = value;
    }

    /**
     * Getter vel_t
     * @return {number[]}
     */
    public get vel_t(): number[] {
        return this._vel_t;
    }

    /**
     * Setter vel_t
     * @param {number[]} value
     */
    public set vel_t(value: number[]) {
        this._vel_t = value;
    }

    /**
     * Getter isActiveLouver
     * @return {boolean}
     */
    public get isActiveLouver(): boolean {
        return this._isActiveLouver;
    }

    /**
     * Setter isActiveLouver
     * @param {boolean} value
     */
    public set isActiveLouver(value: boolean) {
        this._isActiveLouver = value;
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

    public toJSON() {
        let flow = {};

        if (this.flow.type == 'velocity') {
            flow = {
                type: 'velocity',
                vel: this.flow.vel
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

        let ramp_id;
        this.ramp == undefined ? ramp_id = '' : ramp_id = this.ramp.id;

        var surf = {
            id: this.id,
            uuid: this.uuid,
            idAC: this.idAC,
            color: this.color,
            flow: flow,
            isActiveHeater: this.isActiveHeater,
            tmp_front: this.tmp_front,
            isActiveLouver: this.isActiveLouver,
            vel_t: this.vel_t,
            ramp_id: ramp_id,
            ramp_v: ramp_id
        }
        return surf;
    }
}