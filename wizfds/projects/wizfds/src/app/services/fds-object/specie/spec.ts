import { FdsEntities } from '../../../enums/fds/entities/fds-entities';
import { IdGeneratorService } from '../../id-generator/id-generator.service';
import { toNumber, get, toString, find, map } from 'lodash';

export interface ILumpedSpec {
	spec: Spec,
	mass_fraction: number,
	volume_fraction: number
}

export interface ISpec {
	id: string,
	idOld: string,
	uuid: string,
	editable: boolean,
	formula: string,
	mw: number,
	spec: string,
	lumped_component_only: boolean,
	background: boolean,
	lumpedSpecs: Spec[],
	lumpedType: string
}

export class Spec {

	private _id: string;
	private _idOld: string;
	private _uuid: string;
	private _editable: boolean;
	private _formula: string;
	private _mw: number;
	private _spec: string;
	private _lumped_component_only: boolean;
	private _background: boolean;
	private _lumpedSpecs: ILumpedSpec[];
	private _lumpedType: string;

	constructor(jsonString: string) {

		let base: ISpec;
		base = <ISpec>JSON.parse(jsonString);

		let idGeneratorService = new IdGeneratorService;

		let spec = FdsEntities.spec;

		this.id = base.id || '';
		this.idOld = toString(get(base, 'idOld', this.id));
		this.uuid = base.uuid || idGeneratorService.genUUID();

		this.editable = (get(base, 'editable', true) == true);
		this.formula = toString(get(base, 'formula', spec.formula.default[0]));
		this.mw = toNumber(get(base, 'mw', spec.mw.default[0]));

		this.spec = toString(get(base, 'spec', 'No SPEC'));

		this.lumped_component_only = (get(base, 'lumped_component_only', spec.lumped_component_only.default[0]) == true);
		this.background = (get(base, 'background', spec.background.default[0]) == true);

		this.lumpedSpecs = [];
		this.lumpedType = toString(get(base, 'lumpedType', 'massFraction'));
	}

	public addLumpedSpecs(jsonString: string, specs: Spec[]) {
		let base: ISpec;
		base = <ISpec>JSON.parse(jsonString);

        let lumpedSpecs = base.lumpedSpecs != undefined && base.lumpedSpecs.length > 0 ? map(base.lumpedSpecs, (lumpedSpec) => {
            if (lumpedSpec['spec_id'] != undefined && lumpedSpec['spec_id'] != '') {
                let spec = <Spec> find(specs, function (o: Spec) { return o.id == lumpedSpec.spec['spec_id'] });
                return { spec: spec, mass_fraction: lumpedSpec['mass_fraction'], volume_fraction: lumpedSpec['volume_fraction'] };
            }
		}) : [];

		return lumpedSpecs;
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
		this.idOld = value;
	}

    /**
     * Getter idOld
     * @return {string}
     */
	public get idOld(): string {
		return this._idOld;
	}

    /**
     * Setter idOld
     * @param {string} value
     */
	public set idOld(value: string) {
		this._idOld = value;
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
     * Getter editable
     * @return {boolean}
     */
	public get editable(): boolean {
		return this._editable;
	}

    /**
     * Setter editable
     * @param {boolean} value
     */
	public set editable(value: boolean) {
		this._editable = value;
	}

    /**
     * Getter formula
     * @return {string}
     */
	public get formula(): string {
		return this._formula;
	}

    /**
     * Setter formula
     * @param {string} value
     */
	public set formula(value: string) {
		this._formula = value;
	}

    /**
     * Getter mw
     * @return {number}
     */
	public get mw(): number {
		return this._mw;
	}

    /**
     * Setter mw
     * @param {number} value
     */
	public set mw(value: number) {
		this._mw = value;
	}

    /**
     * Getter spec
     * @return {string}
     */
	public get spec(): string {
		return this._spec;
	}

    /**
     * Setter spec
     * @param {string} value
     */
	public set spec(value: string) {
		this._spec = value;
		this._id = value == 'No SPEC' ? this.idOld : this._id = value;
	}

    /**
     * Getter lumped_component_only
     * @return {boolean}
     */
	public get lumped_component_only(): boolean {
		return this._lumped_component_only;
	}

    /**
     * Setter lumped_component_only
     * @param {boolean} value
     */
	public set lumped_component_only(value: boolean) {
		this._lumped_component_only = value;
	}

    /**
     * Getter background
     * @return {boolean}
     */
	public get background(): boolean {
		return this._background;
	}

    /**
     * Setter background
     * @param {boolean} value
     */
	public set background(value: boolean) {
		this._background = value;
	}

    /**
     * Getter lumpedSpecs
     * @return {ILumpedSpec[]}
     */
	public get lumpedSpecs(): ILumpedSpec[] {
		return this._lumpedSpecs;
	}

    /**
     * Setter lumpedSpecs
     * @param {ILumpedSpec[]} value
     */
	public set lumpedSpecs(value: ILumpedSpec[]) {
		this._lumpedSpecs = value;
	}

    /**
     * Getter lumpedType
     * @return {string}
     */
	public get lumpedType(): string {
		return this._lumpedType;
	}

    /**
     * Setter lumpedType
     * @param {string} value
     */
	public set lumpedType(value: string) {
		this._lumpedType = value;
	}

	/** Export to json */
	public toJSON(): object {
        let lumpedSpecs = map(this.lumpedSpecs, function (o: ILumpedSpec) {
            return { spec_id: o.spec.id, mass_fraction: o.mass_fraction, volume_fraction: o.volume_fraction }
		});

		let spec = {
			id: this.id,
			idOld: this.idOld,
			uuid: this.uuid,
			editable: this.editable,
			formula: this.formula,
			mw: this.mw,
			spec: this.spec,
			lumped_component_only: this.lumped_component_only,
			background: this.background,
			lumpedSpecs: lumpedSpecs,
			lumpedType: this.lumpedType
		}
		return spec;
	}
}
