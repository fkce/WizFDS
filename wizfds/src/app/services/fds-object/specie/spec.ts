import { FdsEntities } from '../../../enums/fds/entities/fds-entities';
import { IdGeneratorService } from '../../id-generator/id-generator.service';
import { toNumber, get, toString } from 'lodash';

export interface SpecObject {
	id: string,
	idOld: string,
	uuid: string,
	editable: boolean,
	formula: string,
	mw: number,
	spec: string,
}
export class Spec {

	private _id: string;
	private _idOld: string;
	private _uuid: string;
	private _editable: boolean;
	private _formula: string;
	private _mw: number;
	private _spec: string;

	constructor(jsonString: string) {

		let base: SpecObject;
		base = <SpecObject>JSON.parse(jsonString);

		let idGeneratorService = new IdGeneratorService;

		let spec = FdsEntities.spec;

		this.id = base.id || '';
		this.idOld = toString(get(base, 'idOld', this.id));
		this.uuid = base.uuid || idGeneratorService.genUUID();

		this.editable = (get(base, 'editable', true) == true);
		this.formula = toString(get(base, 'formula', spec.formula.default[0]));
		this.mw = toNumber(get(base, 'mw', spec.mw.default[0]));

		this.spec = toString(get(base, 'spec', 'No SPEC'));
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

	/** Export to json */
	public toJSON(): object {
		let spec = {
			id: this.id,
			idOld: this.idOld,
			uuid: this.uuid,
			editable: this.editable,
			formula: this.formula,
			mw: this.mw,
			spec: this.spec
		}
		return spec;
	}
}
