import { IdGeneratorService } from '../../../services/id-generator/id-generator.service'
import { FdsEntities } from '../../../enums/fds/entities/fds-entities'
import { Xb } from '../primitives';
import { WebsocketService } from '../../websocket/websocket.service';
import { Injector } from '@angular/core/src/di/injector';
import { get, round, toNumber, toString } from 'lodash';

export interface MeshObject {
    id: string,
    uuid: string,
    idAC: number,
    isize: number,
    jsize: number,
    ksize: number,
    ijk: number[],
    xb: Xb,
    cells: number,
    color: string
}

export class Mesh {
    private _id: string;
    private _uuid: string;
    private _idAC: number;
    private _isize: number;
    private _jsize: number;
    private _ksize: number;
    private _ijk: number[];
    private _xb: Xb;
    private _cells: number;
    private _color: string;

    constructor(jsonString: string) {

        let base: MeshObject;
        base = <MeshObject>JSON.parse(jsonString);

        let idGeneratorService = new IdGeneratorService;

        let mesh = FdsEntities.mesh;

        this.id = base.id || '';
        this.uuid = base.uuid || idGeneratorService.genUUID();
        this.idAC = base.idAC || 0;

        this.xb = new Xb(JSON.stringify(base.xb)) || new Xb(JSON.stringify({}));

        this.ijk = [0,0,0];

        this.isize = toNumber(get(base, 'isize', 0.1));
        this.jsize = toNumber(get(base, 'jsize', 0.1));
        this.ksize = toNumber(get(base, 'ksize', 0.1));

        this.cells = this.calcCells();
        this.color = toString(get(base, 'color', mesh.color.default[0]));

        this.calcIjk();
    }

    public calcIjk() {
        this.ijk[0] = round((this.xb.x2 - this.xb.x1) / this.isize, 6)
        this.ijk[1] = round((this.xb.y2 - this.xb.y1) / this.jsize, 6)
        this.ijk[2] = round((this.xb.z2 - this.xb.z1) / this.ksize, 6)
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
     * Getter isize
     * @return {number}
     */
	public get isize(): number {
		return this._isize;
	}

    /**
     * Setter isize
     * @param {number} value
     */
	public set isize(value: number) {
        this._isize = round(value, 6);
        this._ijk[0] = round((this.xb.x2 - this.xb.x1) / value, 6);
	}

    /**
     * Getter jsize
     * @return {number}
     */
	public get jsize(): number {
		return this._jsize;
	}

    /**
     * Setter jsize
     * @param {number} value
     */
	public set jsize(value: number) {
        this._jsize = round(value, 6);
        this._ijk[1] = round((this.xb.y2 - this.xb.y1) / value, 6);
	}

    /**
     * Getter ksize
     * @return {number}
     */
	public get ksize(): number {
		return this._ksize;
	}

    /**
     * Setter ksize
     * @param {number} value
     */
	public set ksize(value: number) {
        this._ksize = round(value, 6);
        this._ijk[2] = round((this.xb.z2 - this.xb.z1) / value, 6);
	}

    /**
     * Getter ijk
     * @return {number[]}
     */
	public get ijk(): number[] {
		return this._ijk;
	}

    /**
     * Setter ijk
     * @param {number[]} value
     */
	public set ijk(value: number[]) {
        this._ijk = value;
    }
    
    /**
     * Getter i
     * @return {number}
     */
	public get i(): number {
		return this._ijk[0];
	}

    /**
     * Setter i
     * @param {number} value
     */
    public set i(value: number) {
        this._ijk[0] = value;
        this._isize = round((this.xb.x2 - this.xb.x1) / this._ijk[0], 6);
    }

    /**
     * Getter j
     * @return {number}
     */
	public get j(): number {
		return this._ijk[1];
	}

    /**
     * Setter j
     * @param {number} value
     */
    public set j(value: number) {
        this._ijk[1] = value;
        this._jsize = round((this.xb.y2 - this.xb.y1) / this._ijk[1], 6);
    }

    /**
     * Getter k
     * @return {number}
     */
	public get k(): number {
		return this._ijk[2];
	}

    /**
     * Setter k
     * @param {number} value
     */
    public set k(value: number) {
        this._ijk[2] = value;
        this._ksize = round((this.xb.z2 - this.xb.z1) / this._ijk[2], 2);
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
     * Getter cells
     * @return {number}
     */
	public get cells(): number {
		return this._cells;
	}

    /**
     * Setter cells
     * @param {number} value
     */
	public set cells(value: number) {
		this._cells = value;
	}

    /**
     * Getter color
     * @return {string}
     */
	public get color(): string {
		return this._color;
	}

    /**
     * Setter color
     * @param {string} value
     */
	public set color(value: string) {
		this._color = value;
    }

    /** getter/setter x1 */
    get x1() {
        return this.xb.x1;
    }
    set x1(x1: number) {
        this.xb.x1 = x1;
        this.ijk[0] = round((this.xb.x2 - this.xb.x1) / this.isize, 6);
    }

    /** getter/setter x2 */
    get x2() {
        return this.xb.x2;
    }
    set x2(x2: number) {
        this.xb.x2 = x2;
        this.ijk[0] = round((this.xb.x2 - this.xb.x1) / this.isize, 6);
    }

    /** getter/setter x1 */
    get y1() {
        return this.xb.y1;
    }
    set y1(y1: number) {
        this.xb.y1 = y1;
        this.ijk[1] = round((this.xb.y2 - this.xb.y1) / this.jsize, 6);
    }

    /** getter/setter x2 */
    get y2() {
        return this.xb.y2;
    }
    set y2(y2: number) {
        this.xb.y2 = y2;
        this.ijk[1] = round((this.xb.y2 - this.xb.y1) / this.jsize, 6);
    }

    /** getter/setter x1 */
    get z1() {
        return this.xb.z1;
    }
    set z1(z1: number) {
        this.xb.z1 = z1;
        this.ijk[2] = round((this.xb.z2 - this.xb.z1) / this.ksize, 6);
    }

    /** getter/setter x2 */
    get z2() {
        return this.xb.z2;
    }
    set z2(z2: number) {
        this.xb.z2 = z2;
        this.ijk[2] = round((this.xb.z2 - this.xb.z1) / this.ksize, 6);
    }
    
    public calcCells(): number {
        return this.ijk[0] * this.ijk[1] * this.ijk[2];
    }

    /** Export to json */
    public toJSON(): object {
        let mesh: object = {
            id: this.id,
            uuid: this.uuid,
            idAC: this.idAC,
            ijk: this.ijk,
            isize: this.isize,
            jsize: this.jsize,
            ksize: this.ksize,
            xb: this.xb.toJSON(),
            color: this._color
        }
        return mesh;
    }

}
