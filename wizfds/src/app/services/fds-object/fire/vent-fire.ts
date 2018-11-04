import { FdsEntities } from '../../../enums/fds/entities/fds-entities';
import { IdGeneratorService } from '../../id-generator/id-generator.service';
import { Xb, Xyz } from '../primitives';

export interface VentObject {
    id: string,
    uuid: string,
    idAC: number,
    elevation: number,
    xb: Xb,
    xyz: Xyz
}

export class VentFire {
    private _id: string;
    private _uuid: string;
    private _idAC: number;
    private _xb: Xb;
    private _xyz: Xyz;
    private _elevation: number;

    constructor(jsonString: string) {

        let base: VentObject;
        base = <VentObject>JSON.parse(jsonString);

        let idGeneratorService = new IdGeneratorService;

        let vent = FdsEntities.vent;

        this.id = base.id || '';
        this.uuid = base.uuid || idGeneratorService.genUUID();
        this.idAC = base.idAC || 0;
        this.elevation = base.elevation || 0;

		this.xb = new Xb(JSON.stringify(base.xb), 'vent') || new Xb(JSON.stringify({}), 'vent');
        this.xyz = new Xyz(JSON.stringify(base.xyz)) || new Xyz(JSON.stringify({}));
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
     * Getter xyz
     * @return {Xyz}
     */
	public get xyz(): Xyz {
		return this._xyz;
	}

    /**
     * Setter xyz
     * @param {Xyz} value
     */
	public set xyz(value: Xyz) {
		this._xyz = value;
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

    public toJSON(): object {
        var vent = {
            id: this.id,
            uuid: this.uuid,
            idAC: this.idAC,
            xb: this.xb.toJSON(),
            xyz: this.xyz.toJSON()
        }
        return vent;
    }


}