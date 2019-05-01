import { Surf } from './surf';
import { IdGeneratorService } from '@services/id-generator/id-generator.service';
import { Xb } from "../primitives";
import { Devc } from '../output/devc';
import { find, get, set, toArray } from 'lodash';
import { FdsEntities } from '@enums/fds/entities/fds-entities';

export interface ISurf {
		type?: string,
		oldType?: string,
		surf_id?: string | Surf, // base object include only id to not export to db whole object of surf
}

export interface IGeom {
	id: string,
	uuid: string,
	idAC: number,
	surf: any,
	surf_id: string,
    elevation: number,
    verts: any,
    faces: any
}

export class Geom {
	private _id: string;
	private _uuid: string;
	private _idAC: number;
	private _surf: any;
    private _elevation: number;
    private _verts: any;
    private _faces: any;

	constructor(jsonString: string, surfs: Surf[] = undefined) {

		let base: IGeom;
		base = <IGeom>JSON.parse(jsonString);

		let idGeneratorService = new IdGeneratorService;

		let geom = FdsEntities.geom;

		this.id = base.id || '';
		this.uuid = base.uuid || idGeneratorService.genUUID();
		this.idAC = base.idAC || 0;

        this.elevation = base.elevation || 0;
        
        this.verts = base.verts || undefined;
		this.faces = base.faces || undefined;

		console.log(base);

		if(base.surf_id) {
			this.surf = surfs ? find(surfs, function (surf) { return surf.id == base.surf_id; }) : undefined;
		}
		else {
			this.surf = surfs && base.surf != undefined ? find(surfs, function (surf) { return surf.id == base.surf.surf_id; }) : undefined;
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
     * Getter surf
     * @return {any}
     */
	public get surf(): any {
		return this._surf;
	}

    /**
     * Setter surf
     * @param {any} value
     */
	public set surf(value: any) {
		this._surf = value;
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

    /**
     * Getter verts
     * @return {any}
     */
	public get verts(): any {
		return this._verts;
	}

    /**
     * Setter verts
     * @param {any} value
     */
	public set verts(value: any) {
		this._verts = value;
	}

    /**
     * Getter faces
     * @return {any}
     */
	public get faces(): any {
		return this._faces;
	}

    /**
     * Setter faces
     * @param {any} value
     */
	public set faces(value: any) {
		this._faces = value;
	}

	/**
	 * Export to json
	 */
	public toJSON(): object {

		var geom = {
			id: this.id,
			uuid: this.uuid,
			idAC: this.idAC,
			elevation: this.elevation,
			surf_id: this.surf.id,
			verts: this.verts,
			faces: this.faces
        }

		return geom;
	}

}

