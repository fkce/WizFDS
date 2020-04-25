import { IdGeneratorService } from "../../id-generator/id-generator.service";
import { FdsEntities } from "../../../enums/fds/entities/fds-entities";
import { get } from "lodash";

export interface TimeObject {
    t_begin: number,
    t_end: number,
    dt: number,
    lock_time_step: boolean,
    restrict_time_step: boolean
}

export class Time {
    private _t_begin: number;
    private _t_end: number;
    private _dt: number;
    private _lock_time_step: boolean;
    private _restrict_time_step: boolean;

    constructor(jsonString: string) {

        let base: TimeObject;
        base = <TimeObject>JSON.parse(jsonString);

        let idGeneratorService = new IdGeneratorService;
        let time = FdsEntities.time;

        this.t_begin = get(base, 't_begin', time.t_begin.default[0]);
        this.t_end = get(base, 't_end', time.t_end.default[0]);
        this.dt = get(base, 'dt', undefined);
        this.lock_time_step = get(base, 'lock_time_step', time.lock_time_step.default[0]);
        this.restrict_time_step = get(base, 'restrict_time_step', time.restrict_time_step.default[0])
    }

    /**
     * Getter t_begin
     * @return {number}
     */
    public get t_begin(): number {
        return this._t_begin;
    }

    /**
     * Setter t_begin
     * @param {number} value
     */
    public set t_begin(value: number) {
        this._t_begin = value;
    }

    /**
     * Getter t_end
     * @return {number}
     */
    public get t_end(): number {
        return this._t_end;
    }

    /**
     * Setter t_end
     * @param {number} value
     */
    public set t_end(value: number) {
        this._t_end = value;
    }

    /**
     * Getter dt
     * @return {number}
     */
    public get dt(): number {
        return this._dt;
    }

    /**
     * Setter dt
     * @param {number} value
     */
    public set dt(value: number) {
        this._dt = value;
    }

    /**
     * Getter lock_time_step
     * @return {boolean}
     */
    public get lock_time_step(): boolean {
        return this._lock_time_step;
    }

    /**
     * Setter lock_time_step
     * @param {boolean} value
     */
    public set lock_time_step(value: boolean) {
        this._lock_time_step = value;
    }

    /**
     * Getter restrict_time_step
     * @return {boolean}
     */
    public get restrict_time_step(): boolean {
        return this._restrict_time_step;
    }

    /**
     * Setter restrict_time_step
     * @param {boolean} value
     */
    public set restrict_time_step(value: boolean) {
        this._restrict_time_step = value;
    }

    /** Export to json */
    public toJSON(): object {
        let time: object = {
            t_begin: this.t_begin,
            t_end: this.t_end,
            dt: this.dt,
            lock_time_step: this.lock_time_step,
            restrict_time_step: this.restrict_time_step
        }
        return time;
    }
}

