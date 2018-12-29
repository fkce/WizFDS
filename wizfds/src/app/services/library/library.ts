import { Fire } from '@services/fds-object/fire/fire';
import { JetFan } from '@services/fds-object/ventilation/jet-fan';
import { Surf } from '@services/fds-object/geometry/surf';
import { Matl } from '@services/fds-object/geometry/matl';
import { Ramp } from '@services/fds-object/ramp/ramp';
import { SurfVent } from '@services/fds-object/ventilation/surf-vent';
import { Fuel } from '@services/fds-object/fire/fuel';
import { Spec } from '@services/fds-object/specie/spec';
import { Slcf } from '@services/fds-object/output/slcf';
import { Isof } from '@services/fds-object/output/isof';
import { Devc } from '@services/fds-object/output/devc';
import { get, map } from 'lodash';
import { SurfSpec } from '@services/fds-object/specie/surf-spec';
import { VentSpec } from '@services/fds-object/specie/vent';

export interface LibraryObject {
	ramps: Ramp[],
	matls: Matl[],
	surfs: Surf[],
	ventsurfs: SurfVent[],
	specsurfs: SurfSpec[],
	specvents: VentSpec[],
	jetfans: JetFan[],
	fires: Fire[],
	fuels: Fuel[],
	specs: Spec[],
	slcfs: Slcf[],
	isofs: Isof[],
	devcs: Devc[]
}

export class Library {

	private _ramps: Ramp[];
	private _matls: Matl[];
	private _surfs: Surf[];
	private _ventsurfs: SurfVent[];
	private _specsurfs: SurfSpec[];
	private _specvents: VentSpec[];
	private _jetfans: JetFan[];
	private _fires: Fire[];
	private _fuels: Fuel[];
	private _specs: Spec[];
	private _slcfs: Slcf[];
	private _isofs: Isof[];
	private _devcs: Devc[];

	constructor(jsonString: string) {

		let base: LibraryObject;
		base = <LibraryObject>JSON.parse(jsonString);

		this.specs = get(base, 'specs') === undefined ? [] : map(base.specs, (spec) => {
			return new Spec(JSON.stringify(spec));
		});

		this.specsurfs = get(base, 'specsurfs') === undefined ? [] : map(base.specsurfs, (specsurf) => {
			return new SurfSpec(JSON.stringify(specsurf), this.ramps, this.specs);
		});

		this.specvents = get(base, 'specvents') === undefined ? [] : map(base.specvents, (specvent) => {
			return new VentSpec(JSON.stringify(specvent), this.specsurfs);
		});

		this.ramps = get(base, 'ramps') === undefined ? [] : map(base.ramps, (ramp) => {
			return new Ramp(JSON.stringify(ramp));
		});

		this.matls = get(base, 'matls') === undefined ? [] : map(base.matls, (matl) => {
			return new Matl(JSON.stringify(matl), this.ramps);
		});

		this.surfs = get(base, 'surfs') === undefined ? [] : map(base.surfs, (surf) => {
			return new Surf(JSON.stringify(surf), this.matls);
		});

		this.ventsurfs = get(base, 'ventsurfs') === undefined ? [] : map(base.ventsurfs, (ventsurf) => {
			return new SurfVent(JSON.stringify(ventsurf), this.ramps);
		});

		this.jetfans = get(base, 'jetfans') === undefined ? [] : map(base.jetfans, (jetfan) => {
			return new JetFan(JSON.stringify(jetfan), this.ramps);
		});

		this.fires = get(base, 'fires') === undefined ? [] : map(base.fires, (fire) => {
			return new Fire(JSON.stringify(fire), this.ramps);
		});

		this.fuels = get(base, 'fuels') === undefined ? [] : map(base.fuels, (fuel) => {
			return new Fuel(JSON.stringify(fuel));
		});

		this.slcfs = get(base, 'slcfs') === undefined ? [] : map(base.slcfs, (slcf) => {
			return new Slcf(JSON.stringify(slcf));
		});

		this.isofs = get(base, 'isofs') === undefined ? [] : map(base.isofs, (isof) => {
			return new Isof(JSON.stringify(isof));
		});

		this.devcs = get(base, 'devcs') === undefined ? [] : map(base.devcs, (devc) => {
			return new Devc(JSON.stringify(devc), undefined, this.specs, undefined);
		});
	}


    /**
     * Getter ramps
     * @return {Ramp[]}
     */
	public get ramps(): Ramp[] {
		return this._ramps;
	}

    /**
     * Setter ramps
     * @param {Ramp[]} value
     */
	public set ramps(value: Ramp[]) {
		this._ramps = value;
	}

    /**
     * Getter matls
     * @return {Matl[]}
     */
	public get matls(): Matl[] {
		return this._matls;
	}

    /**
     * Setter matls
     * @param {Matl[]} value
     */
	public set matls(value: Matl[]) {
		this._matls = value;
	}

    /**
     * Getter surfs
     * @return {Surf[]}
     */
	public get surfs(): Surf[] {
		return this._surfs;
	}

    /**
     * Setter surfs
     * @param {Surf[]} value
     */
	public set surfs(value: Surf[]) {
		this._surfs = value;
	}

    /**
     * Getter ventsurfs
     * @return {SurfVent[]}
     */
	public get ventsurfs(): SurfVent[] {
		return this._ventsurfs;
	}

    /**
     * Setter ventsurfs
     * @param {SurfVent[]} value
     */
	public set ventsurfs(value: SurfVent[]) {
		this._ventsurfs = value;
	}

    /**
     * Getter specsurfs
     * @return {SurfSpec[]}
     */
	public get specsurfs(): SurfSpec[] {
		return this._specsurfs;
	}

    /**
     * Setter specsurfs
     * @param {SurfSpec[]} value
     */
	public set specsurfs(value: SurfSpec[]) {
		this._specsurfs = value;
	}

    /**
     * Getter jetfans
     * @return {JetFan[]}
     */
	public get jetfans(): JetFan[] {
		return this._jetfans;
	}

    /**
     * Setter jetfans
     * @param {JetFan[]} value
     */
	public set jetfans(value: JetFan[]) {
		this._jetfans = value;
	}

    /**
     * Getter fires
     * @return {Fire[]}
     */
	public get fires(): Fire[] {
		return this._fires;
	}

    /**
     * Setter fires
     * @param {Fire[]} value
     */
	public set fires(value: Fire[]) {
		this._fires = value;
	}

    /**
     * Getter fuels
     * @return {Fuel[]}
     */
	public get fuels(): Fuel[] {
		return this._fuels;
	}

    /**
     * Setter fuels
     * @param {Fuel[]} value
     */
	public set fuels(value: Fuel[]) {
		this._fuels = value;
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
     * Getter slcfs
     * @return {Slcf[]}
     */
	public get slcfs(): Slcf[] {
		return this._slcfs;
	}

    /**
     * Setter slcfs
     * @param {Slcf[]} value
     */
	public set slcfs(value: Slcf[]) {
		this._slcfs = value;
	}

    /**
     * Getter isofs
     * @return {Isof[]}
     */
	public get isofs(): Isof[] {
		return this._isofs;
	}

    /**
     * Setter isofs
     * @param {Isof[]} value
     */
	public set isofs(value: Isof[]) {
		this._isofs = value;
	}

    /**
     * Getter devcs
     * @return {Devc[]}
     */
	public get devcs(): Devc[] {
		return this._devcs;
	}

    /**
     * Setter devcs
     * @param {Devc[]} value
     */
	public set devcs(value: Devc[]) {
		this._devcs = value;
	}

    /**
     * Getter specvents
     * @return {VentSpec[]}
     */
	public get specvents(): VentSpec[] {
		return this._specvents;
	}

    /**
     * Setter specvents
     * @param {VentSpec[]} value
     */
	public set specvents(value: VentSpec[]) {
		this._specvents = value;
	}

	/** Export to json */
	public toJSON(): object {
		let library = {
			ramps: this.ramps,
			matls: this.matls,
			surfs: this.surfs,
			ventsurfs: this.ventsurfs,
			jetfans: this.jetfans,
			fires: this.fires,
			fuels: this.fuels,
			specs: this.specs,
			specsurfs: this.specsurfs,
			specvents: this.specvents,
			slcfs: this.slcfs,
			isofs: this.isofs,
			devcs: this.devcs,
		}
		return library;
	}
}
