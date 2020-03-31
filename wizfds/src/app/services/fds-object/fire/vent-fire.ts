import { FdsEntities } from '../../../enums/fds/entities/fds-entities';
import { IdGeneratorService } from '../../id-generator/id-generator.service';
import { Xb, Xyz } from '../primitives';
import { get, round } from 'lodash';

export interface VentObject {
    id: string,
    uuid: string,
    idAC: number,
    elevation: number,
    xb: Xb,
    xyz: Xyz,
    area: number,
    radius: number
}

export class VentFire {
    private _id: string;
    private _uuid: string;
    private _idAC: number;
    private _xb: Xb;
    private _xyz: Xyz;
    private _elevation: number;
    private _area: number;
    private _radius: number;

    constructor(jsonString: string) {

        let base: VentObject;
        base = <VentObject>JSON.parse(jsonString);

        let idGeneratorService = new IdGeneratorService;

        let vent = FdsEntities.vent;

        this.id = get(base, 'id', '');
        this.uuid = get(base, 'uuid', idGeneratorService.genUUID());
        this.idAC = get(base, 'idAC', 0);
        this.elevation = get(base, 'elevation', 0);

        this.xb = new Xb(JSON.stringify(base.xb), 'vent') || new Xb(JSON.stringify({}), 'vent');

        // Recalculate XYZ from XB if undefined
        if (base.xyz) {
            this.xyz = new Xyz(JSON.stringify(base.xyz))
        }
        else {
            this.xyz = new Xyz(JSON.stringify({}));
            this.xyz.recalc(this.xb);
        }

        // if undefinde calc from xb
        this.area = get(base, 'area', this.calcArea());
        this.radius = get(base, 'radius', 0);
    }

    /**
     * Calculate area from XB
     */
    public calcArea() {

        let area: number = 0;
        if (this.xb.z1 == this.xb.z2) {
            area = Math.abs((this.xb.x2 - this.xb.x1) * (this.xb.y2 - this.xb.y1));
        }
        else if (this.xb.y1 == this.xb.y2) {
            area = Math.abs((this.xb.x2 - this.xb.x1) * (this.xb.z2 - this.xb.z1));
        }
        else if (this.xb.x1 == this.xb.x2) {
            area = Math.abs((this.xb.z2 - this.xb.z1) * (this.xb.z2 - this.xb.z1));
        }
        return round(area, 6);
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
     * Getter radius
     * @return {number}
     */
    public get radius(): number {
        return this._radius;
    }

    /**
     * Setter radius
     * @param {number} value
     */
    public set radius(value: number) {
        this._radius = value;
    }

    public toJSON(): object {
        var vent = {
            id: this.id,
            uuid: this.uuid,
            idAC: this.idAC,
            xb: this.xb.toJSON(),
            xyz: this.xyz.toJSON(),
            area: this.area,
            radius: this.radius
        }
        return vent;
    }


}