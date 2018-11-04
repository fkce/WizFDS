import { IdGeneratorService } from "../../id-generator/id-generator.service";
import { FdsEntities } from "../../../enums/fds/entities/fds-entities";
import { get } from "lodash";

export interface MiscObject {
    tmpa: number,
    p_inf: number,
    humidity: number,
    gvec: number[],
    restart: boolean,
    dns: boolean,
    overwrite: boolean,
    noise: boolean,
    noise_velocity: number
}

export class Misc {
    private _tmpa: number;
    private _p_inf: number;
    private _humidity: number;
    private _gvec: number[];
    private _restart: boolean;
    private _dns: boolean;
    private _overwrite: boolean;
    private _noise: boolean;
    private _noise_velocity: number;

    constructor(jsonString: string) {

        let base: MiscObject;
        base = <MiscObject>JSON.parse(jsonString);

        let idGeneratorService = new IdGeneratorService;
        let misc = FdsEntities.misc;

        this.tmpa = get(base, 'misc.tmpa', misc.tmpa.default[0]);
        this.p_inf = get(base, 'misc.p_inf', misc.p_inf.default[0]);
        this.humidity = get(base, 'misc.humidity', misc.humidity.default[0]);
        this.gvec = get(base, 'misc.gvec', misc.gvec.default);
        this.restart = get(base, 'misc.restart', misc.restart.default[0]);
        this.dns = get(base, 'misc.dns', misc.dns.default[0]);
        this.overwrite = get(base, 'misc.overwrite', misc.overwrite.default[0]);
        this.noise = get(base, 'misc.noise', misc.noise.default[0]);
        this.noise_velocity = get(base, 'misc.noise_velocity', misc.noise_velocity.default[0]);
    }

    /**
     * Getter tmpa
     * @return {number}
     */
    public get tmpa(): number {
        return this._tmpa;
    }

    /**
     * Setter tmpa
     * @param {number} value
     */
    public set tmpa(value: number) {
        this._tmpa = value;
    }

    /**
     * Getter p_inf
     * @return {number}
     */
    public get p_inf(): number {
        return this._p_inf;
    }

    /**
     * Setter p_inf
     * @param {number} value
     */
    public set p_inf(value: number) {
        this._p_inf = value;
    }

    /**
     * Getter humidity
     * @return {number}
     */
    public get humidity(): number {
        return this._humidity;
    }

    /**
     * Setter humidity
     * @param {number} value
     */
    public set humidity(value: number) {
        this._humidity = value;
    }

    /**
     * Getter gvec
     * @return {number[]}
     */
    public get gvec(): number[] {
        return this._gvec;
    }

    /**
     * Setter gvec
     * @param {number[]} value
     */
    public set gvec(value: number[]) {
        this._gvec = value;
    }

    /**
     * Getter restart
     * @return {boolean}
     */
    public get restart(): boolean {
        return this._restart;
    }

    /**
     * Setter restart
     * @param {boolean} value
     */
    public set restart(value: boolean) {
        this._restart = value;
    }

    /**
     * Getter dns
     * @return {boolean}
     */
    public get dns(): boolean {
        return this._dns;
    }

    /**
     * Setter dns
     * @param {boolean} value
     */
    public set dns(value: boolean) {
        this._dns = value;
    }

    /**
     * Getter overwrite
     * @return {boolean}
     */
    public get overwrite(): boolean {
        return this._overwrite;
    }

    /**
     * Setter overwrite
     * @param {boolean} value
     */
    public set overwrite(value: boolean) {
        this._overwrite = value;
    }

    /**
     * Getter noise
     * @return {boolean}
     */
    public get noise(): boolean {
        return this._noise;
    }

    /**
     * Setter noise
     * @param {boolean} value
     */
    public set noise(value: boolean) {
        this._noise = value;
    }

    /**
     * Getter noise_velocity
     * @return {number}
     */
    public get noise_velocity(): number {
        return this._noise_velocity;
    }

    /**
     * Setter noise_velocity
     * @param {number} value
     */
    public set noise_velocity(value: number) {
        this._noise_velocity = value;
    }

    /** Export to json */
    public toJSON(): object {
        let misc: object = {
            tmpa: this.tmpa,
            p_inf: this.p_inf,
            humidity: this.humidity,
            gvec: this.gvec,
            restart: this.restart,
            dns: this.dns,
            overwrite: this.overwrite,
            noise: this.noise,
            noise_velocity: this.noise_velocity
        }
        return misc;
    }
}

