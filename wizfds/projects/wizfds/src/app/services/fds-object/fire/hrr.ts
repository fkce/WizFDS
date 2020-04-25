import { get, toNumber, round, unset } from "lodash";
import { FdsEntities } from "../../../enums/fds/entities/fds-entities";

export interface HrrObject {
    hrr_type: string,
    value: number,
    spread_rate: number,
    alpha: number,
    alpha2: number,
    maxHrr: number,
    sprinklerActivationTime: number,
    time_function: string,
    tau_q: number,
    area: number
}

export class Hrr {
    private _hrr_type: string;
    private _value: number;
    private _spread_rate: number;
    private _alpha: number;
    private _alpha2: number;
    private _maxHrr: number;
    private _sprinklerActivationTime: number;
    private _time_function: string;
    private _tau_q: number;
    private _area: number;

    constructor(jsonString: string) {

        let base: HrrObject;
        base = <HrrObject>JSON.parse(jsonString);

        let surf = FdsEntities.surf;

        this.hrr_type = get(base, 'hrr_type', 'hrrpua') as string;
        this.value = get(base, 'value', surf.hrrpua.default[0]) as number;
        this.spread_rate = get(base, 'spread_rate', 0) as number;
        this.time_function = get(base, 'time_function', 'ramp') as string;
        this.tau_q = get(base, 'tau_q', surf.tau_q.default[0]) as number;

        // This area is assigned from vent-fire
        this.area = get(base, 'area', 1) as number;
        this.alpha = get(base, 'alpha', 0.04689) as number;
        this.alpha2 = get(base, 'alpha2', 0.01172) as number;
        this.maxHrr = get(base, 'maxHrr', 0) as number;
        this.sprinklerActivationTime = get(base, 'sprinklerActivationTime', 0) as number;
        this.calc(true,false,false)
    }

    public calc(alpha?: boolean, spread_rate?: boolean, tau_q?: boolean) {

        setTimeout(() => {

            if (alpha) {
                let radius1 = Math.sqrt(((this.alpha * Math.pow(10, 2)) / (Math.PI * this.value)));
                let radius2 = Math.sqrt(((this.alpha * Math.pow(11, 2)) / (Math.PI * this.value)));
                let spreadRate = round((radius2 - radius1), 6);
                let tauQ = round(Math.sqrt((this.value * this.area) / this.alpha), 2) * (-1);

                this._spread_rate = spreadRate;
                this._tau_q = tauQ;
            }

            if (spread_rate) {
                let alpha = round(Math.pow(this.spread_rate, 2) * Math.PI * this.value, 6);
                let tauQ = round(Math.sqrt((this.value * this.area) / alpha) * (-1), 2);

                this.alpha = alpha;
                this.tau_q = tauQ;
            }

            if (tau_q) {
                let alpha = round((this.value * this.area) / (Math.pow(this.tau_q, 2)), 6);
                this.alpha = alpha;
            }

        }, 50);
    }

    /**
     * Getter hrr_type
     * @return {string}
     */
    public get hrr_type(): string {
        return this._hrr_type;
    }

    /**
     * Setter hrr_type
     * @param {string} value
     */
    public set hrr_type(value: string) {
        this._hrr_type = value;
    }

    /**
     * Getter value
     * @return {number}
     */
    public get value(): number {
        return this._value;
    }

    /**
     * Setter value
     * @param {number} value
     */
    public set value(value: number) {
        this._value = value;
    }

    /**
     * Getter spread_rate
     * @return {number}
     */
    public get spread_rate(): number {
        return this._spread_rate;
    }

    /**
     * Setter spread_rate
     * @param {number} value
     */
    public set spread_rate(value: number) {
        this._spread_rate = value;
    }

    /**
     * Getter alpha
     * @return {number}
     */
    public get alpha(): number {
        return this._alpha;
    }

    /**
     * Setter alpha
     * @param {number} value
     */
    public set alpha(value: number) {
        this._alpha = value;
    }

    /**
     * Getter alpha2
     * @return {number}
     */
	public get alpha2(): number {
		return this._alpha2;
	}

    /**
     * Setter alpha2
     * @param {number} value
     */
	public set alpha2(value: number) {
		this._alpha2 = value;
	}

    /**
     * Getter time_function
     * @return {string}
     */
    public get time_function(): string {
        return this._time_function;
    }

    /**
     * Setter time_function
     * @param {string} value
     */
    public set time_function(value: string) {
        this._time_function = value;
    }

    /**
     * Getter tau_q
     * @return {number}
     */
    public get tau_q(): number {
        return this._tau_q;
    }

    /**
     * Setter tau_q
     * @param {number} value
     */
    public set tau_q(value: number) {
        this._tau_q = value;
    }

    /**
     * Getter area
     * @return {number}
     */
    public get area(): number {
        return this._area;
    }

    /**
     * Setter area
     * @param {number} value
     */
    public set area(value: number) {
        this._area = value;
    }

    /**
     * Getter maxHrr
     * @return {number}
     */
	public get maxHrr(): number {
		return this._maxHrr;
	}

    /**
     * Setter maxHrr
     * @param {number} value
     */
	public set maxHrr(value: number) {
		this._maxHrr = value;
	}

    /**
     * Getter sprinklerActivationTime
     * @return {number}
     */
	public get sprinklerActivationTime(): number {
		return this._sprinklerActivationTime;
	}

    /**
     * Setter sprinklerActivationTime
     * @param {number} value
     */
	public set sprinklerActivationTime(value: number) {
		this._sprinklerActivationTime = value;
	}

    /** Export to json */
    public toJSON(): object {
        let hrrpua = this.hrr_type == 'hrrpua' ? this.value : undefined;
        let mlrpua = this.hrr_type == 'mlrpua' ? this.value : undefined;

        let hrr = {
            hrr_type: this.hrr_type,
            time_function: this.time_function,
            value: this.value,
            spread_rate: this.spread_rate,
            alpha: this.alpha,
            alpha2: this.alpha2,
            sprinklerActivationTime: this.sprinklerActivationTime,
            maxHrr: this.maxHrr,
            tau_q: this.tau_q,
            hrrpua: hrrpua,
            mlrpua: mlrpua
        }
        if (!hrr.hrrpua) unset(hrr, 'hrrpua');
        if (!hrr.mlrpua) unset(hrr, 'mlrpua');

        return hrr;
    }
}
