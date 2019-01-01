import { FdsEntities } from '@enums/fds/entities/fds-entities';
import { IdGeneratorService } from '@services/id-generator/id-generator.service';
import { Surf } from './surf';
import { Xb, Color } from '../primitives';
import { Devc } from '../output/devc';
import { get, find } from 'lodash';

export interface IHole {
	id: string,
	uuid: string,
	idAC: number,
    color: Color,
	elevation: number,
	xb: Xb,
	devc_id: string
}

export class Hole {
	private _id: string;
	private _uuid: string;
	private _idAC: number;
	private _color: Color;
	private _xb: Xb;
	private _devc: Devc;
	private _elevation: number;

	constructor(jsonString: string, surfs: Surf[] = undefined, devcs: Devc[] = undefined) {

		let base: IHole;
		base = <IHole>JSON.parse(jsonString);

		let idGeneratorService = new IdGeneratorService;

		let hole = FdsEntities.hole;

		this.id = base.id || '';
		this.uuid = base.uuid || idGeneratorService.genUUID();
		this.idAC = base.idAC || 0;
        this.color = base.color != undefined && typeof base.color === 'object' ? new Color(JSON.stringify(base.color)) : new Color(JSON.stringify('{}'));
		this.elevation = base.elevation || 0;

		this.xb = new Xb(JSON.stringify(base.xb)) || new Xb(JSON.stringify({}));

		// Create device based on devc_id
		this.devc = get(base, 'devc') === undefined ? this.devc = undefined : this.devc = find(devcs, (devc) => { return devc.id == base.devc_id; });
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
     * Getter devc
     * @return {Devc}
     */
	public get devc(): Devc {
		return this._devc;
	}

    /**
     * Setter devc
     * @param {Devc} value
     */
	public set devc(value: Devc) {
		this._devc = value;
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

	/** Export to JSON */
	public toJSON(): object {

        let devc_id;
		this.devc == undefined ? devc_id = '': devc_id = this.devc.id;

		var hole = {
			id: this.id,
			uuid: this.uuid,
			idAC: this.idAC,
			color: this.color,
			elevation: this.elevation,
			xb: this.xb.toJSON(),
			devc_id: devc_id,
		}
		return hole;
	}
}
