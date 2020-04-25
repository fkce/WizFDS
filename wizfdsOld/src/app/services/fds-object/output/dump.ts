import { Spec } from "../specie/spec";
import { IdGeneratorService } from "../../id-generator/id-generator.service";
import { FdsEntities } from "../../../enums/fds/entities/fds-entities";
import { toNumber, get, map } from "lodash";

export interface DumpInterface {
    nframes: number;
    dt_restart: number;
    mass_file: boolean;
    smoke3d: boolean;
    status_files: boolean;
    plot3d_quantities: string[];
    specs: Spec[];
}

export class Dump {
    private _nframes: number;
    private _dt_restart: number;
    private _mass_file: boolean;
    private _smoke3d: boolean;
    private _status_files: boolean;
    private _plot3d_quantities: string[];
    private _specs: Spec[];

    constructor(jsonString: string, specs?: Spec[]) {

        let base: DumpInterface;
        base = <DumpInterface>JSON.parse(jsonString);

        let idGeneratorService = new IdGeneratorService;

        let dump = FdsEntities.dump;

        this.nframes = toNumber(get(base, 'nframes', dump.nframes.default[0]));
        this.dt_restart = toNumber(get(base, 'dt_restart', dump.dt_restart.default[0]));
        this.mass_file = (get(base, 'mass_file', dump.mass_file.default[0]) == true);
        this.smoke3d = (get(base, 'smoke3d', dump.smoke3d.default[0]) == true);
        this.status_files = (get(base, 'status_files', dump.status_files.default[0]) == true);
        this.plot3d_quantities = get(base, 'plot3d_quantities', []) as string[];

        this.specs = base.specs != undefined && base.specs.length > 0 ? map(base.specs, function (o) { return new Spec(JSON.stringify(o)) }) : [];
    }

    /**
     * Getter nframes
     * @return {number}
     */
	public get nframes(): number {
		return this._nframes;
	}

    /**
     * Setter nframes
     * @param {number} value
     */
	public set nframes(value: number) {
		this._nframes = value;
	}

    /**
     * Getter dt_restart
     * @return {number}
     */
	public get dt_restart(): number {
		return this._dt_restart;
	}

    /**
     * Setter dt_restart
     * @param {number} value
     */
	public set dt_restart(value: number) {
		this._dt_restart = value;
	}

    /**
     * Getter mass_file
     * @return {boolean}
     */
	public get mass_file(): boolean {
		return this._mass_file;
	}

    /**
     * Setter mass_file
     * @param {boolean} value
     */
	public set mass_file(value: boolean) {
		this._mass_file = value;
	}

    /**
     * Getter smoke3d
     * @return {boolean}
     */
	public get smoke3d(): boolean {
		return this._smoke3d;
	}

    /**
     * Setter smoke3d
     * @param {boolean} value
     */
	public set smoke3d(value: boolean) {
		this._smoke3d = value;
	}

    /**
     * Getter status_files
     * @return {boolean}
     */
	public get status_files(): boolean {
		return this._status_files;
	}

    /**
     * Setter status_files
     * @param {boolean} value
     */
	public set status_files(value: boolean) {
		this._status_files = value;
	}

    /**
     * Getter plot3d_quantities
     * @return {string[]}
     */
	public get plot3d_quantities(): string[] {
		return this._plot3d_quantities;
	}

    /**
     * Setter plot3d_quantities
     * @param {string[]} value
     */
	public set plot3d_quantities(value: string[]) {
		this._plot3d_quantities = value;
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

    /** Export to json */
    public toJSON(): object {

        let specs = this.specs.length > 0 ? map(this.specs, function (o: Spec) { return o.toJSON() }) : [];

        var dump = {
            plot3d_quantities: this.plot3d_quantities,
            specs: this.specs,
            nframes: this.nframes,
            dt_restart: this.dt_restart,
            mass_file: this.mass_file,
            smoke3d: this.smoke3d,
            status_files: this.status_files
        }
        return dump;
    }
}
