import { Matl } from './matl';
import { FdsEntities } from '@enums/fds/entities/fds-entities';
import { IdGeneratorService } from '@services/id-generator/id-generator.service';
import { map, toString, get, toNumber, each, find } from 'lodash';
import { Color } from '@services/fds-object/primitives';

export interface ILayers {
    materials: {
        material: Matl,
        fraction: number
    }[],
    thickness: number
}

export interface ISurf {
    id: string,
    uuid: string,
    idAC: number,
    editable: boolean,
    color: Color,
    backing: string,
    adiabatic: boolean,
    transparency: number,
    layers: ILayers[]
}

export class Surf {

    private _id: string;
    private _uuid: string;
    private _idAC: number;
    private _editable: boolean;
    private _color: Color;
    private _backing: string;
    private _adiabatic: boolean;
    private _transparency: number;
    private _layers: ILayers[];

    constructor(jsonString: string, matls: Matl[] = undefined) {

        let base: ISurf;
        base = <ISurf>JSON.parse(jsonString);

        let idGeneratorService = new IdGeneratorService;

        let surf = FdsEntities.surf;

        this.id = base.id || '';
        this.uuid = base.uuid || idGeneratorService.genUUID();
        this.idAC = base.idAC || 0;

        this.editable = base.editable || true;
        this.color = base.color != undefined && typeof base.color === 'object' ? new Color(JSON.stringify(base.color)) : new Color(JSON.stringify('{}'));

        this.adiabatic = (get(base, 'adiabatic', surf.adiabatic.default[0]) == true);
        this.transparency = toNumber(get(base, 'transparency', surf.transparency.default));
        this.backing = toString(get(base, 'backing', surf.backing.default[0]));

        this.layers = [];

        // If matls isset add layers and materials
        if (matls) {
            each(base.layers, (layer) => {
                this.addLayer();
                var index = this.layers.length - 1;
                this.layers[index].thickness = layer.thickness;
                each(layer['materials'], (matl) => {
                    this.addMaterial(index);
                    let matlIndex = this.layers[index].materials.length - 1;
                    let material = find(matls, function (material) {
                        return material.id == matl['matl_id'];
                    });
                    this.layers[index].materials[matlIndex]['material'] = material;
                    this.layers[index].materials[matlIndex]['fraction'] = matl['fraction'];
                });
            });
        }
    }

    /** Add new layer to surf object */
    public addLayer() {
        this.layers.push({
            materials: [],
            thickness: 0,
        });
    };

    /** Delete layer */
    public deleteLayer(index) {
        this.layers.splice(index, 1);
    };

    /** Add material to layer in surf */
    public addMaterial(layerIndex) {
        let layer = this.layers[layerIndex];
        layer.materials.push({
            material: undefined,
            fraction: 0
        });
    };

    /** Delete material from layer in surf */
    public deleteMaterial(layerIndex, matlIndex) {
        this.layers[layerIndex].materials.splice(matlIndex, 1);
    };

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
     * Getter backing
     * @return {string}
     */
	public get backing(): string {
		return this._backing;
	}

    /**
     * Setter backing
     * @param {string} value
     */
	public set backing(value: string) {
		this._backing = value;
	}

    /**
     * Getter adiabatic
     * @return {boolean}
     */
	public get adiabatic(): boolean {
		return this._adiabatic;
	}

    /**
     * Setter adiabatic
     * @param {boolean} value
     */
	public set adiabatic(value: boolean) {
		this._adiabatic = value;
	}

    /**
     * Getter transparency
     * @return {number}
     */
	public get transparency(): number {
		return this._transparency;
	}

    /**
     * Setter transparency
     * @param {number} value
     */
	public set transparency(value: number) {
		this._transparency = value;
	}

    /**
     * Getter layers
     * @return {ILayers[]}
     */
	public get layers(): ILayers[] {
		return this._layers;
	}

    /**
     * Setter layers
     * @param {ILayers[]} value
     */
	public set layers(value: ILayers[]) {
		this._layers = value;
	}

    public toJSON(): object {
        let surf: object = {
            id: this.id,
            uuid: this.uuid,
            idAC: this.idAC,
            color: this.color,
            editable: this.editable,
            backing: this.backing,
            adiabatic: this.adiabatic,
            transparency: this.transparency,
            layers: map(this.layers, function (layer) {
                let materials = map(layer.materials, function (value) {
                    if(value.material != undefined)
                        return { matl_id: value.material.id, fraction: value.fraction };
                    else
                        return { matl_id: '', fraction: value.fraction };
                });
                return { thickness: layer.thickness, materials: materials };
            })
        }
        return surf;
    }

}
