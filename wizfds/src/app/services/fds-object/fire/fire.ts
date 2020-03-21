import { IdGeneratorService } from '../../id-generator/id-generator.service';
import { Ramp } from "../ramp/ramp";
import { SurfFire } from './surf-fire';
import { VentFire } from './vent-fire';
import { round } from 'lodash';
import { Color, Xb } from '../primitives';

export interface IFire {
    id: string,
    uuid: string,
    idAC: number,
    editable: boolean,
    surf: SurfFire,
    vent: VentFire,
}

export class Fire {
    private _id: string;
    private _uuid: string;
    private _idAC: number;
    private _editable: boolean;
    private _surf: SurfFire;
    private _vent: VentFire;

    constructor(jsonString: string, ramps: Ramp[] = undefined) {

        let base: IFire;
        base = <IFire>JSON.parse(jsonString);

        let idGeneratorService = new IdGeneratorService;

        this.id = base.id || '';
        this.uuid = base.uuid || idGeneratorService.genUUID();
        this.idAC = base.idAC || 0;
        this.editable = (base.editable == true);

        if (base.surf) {
            if (!ramps) {
                this.surf = new SurfFire(JSON.stringify(base.surf));
                this.surf.id = this.id;
            } else {
                this.surf = new SurfFire(JSON.stringify(base.surf), ramps);
                this.surf.id = this.id;
            }
        } else {
            this.surf = new SurfFire(JSON.stringify({}));
            this.surf.id = this.id;
        }

        // For old scenarios - to remove
        if (base['color'] != undefined) {
            this.surf.color = new Color(JSON.stringify(base['color']));
        }

        if (base.vent) {
            this.vent = new VentFire(JSON.stringify(base.vent));
            this.surf.hrr.area = this.vent.area;
        } else {
            this.vent = new VentFire(JSON.stringify({}));
            this.vent.area = this.vent.calcArea();
            this.vent.xyz.recalc(this.vent.xb);
            this.surf.hrr.area = this.vent.area;
        }
    }

    /** Calculate total heat release rate */
    public totalHrr() {

        let area = this.vent.area;
        var hrrpua = 0;
        if (this.surf.hrr.hrr_type == 'hrrpua') {
            hrrpua = this.surf.hrr.value;
            this.surf.hrr.area = area;
        }
        return round((1 * area * hrrpua), 6);
    }

    /** Calculate total time of fire spreading */
    public totalTime() {

        var time = (Math.sqrt(this.totalHrr() / this.surf.hrr.alpha)).toFixed(0);
        return time;
    }

    /** Recalculate vent area and fire params */
    public calcArea() {

        // Check first if this.vent.radius > 0 
        if (this.vent.radius > 0) {
            // Calc area for vent ... here can be more complex algorithm to count 
            // affected by radius cells and then calculate total Hrr ...
            this.vent.area = round(Math.PI * Math.pow(this.vent.radius, 2), 3);
            this.surf.hrr.area = this.vent.area;
            this.surf.hrr.calc(false, true, false);
        }
        else {
            // Make sure that there is no negative value
            this.vent.radius = 0;

            this.vent.area = this.vent.calcArea();
            this.vent.xyz.recalc(this.vent.xb);
            this.surf.hrr.area = this.vent.area;
            this.surf.hrr.calc(false, true, false);
        }
    }

    public get id(): string {
        return this._id;
    }

    public set id(value: string) {
        this._id = value;
    }

    public get uuid(): string {
        return this._uuid;
    }

    public set uuid(value: string) {
        this._uuid = value;
    }

    public get idAC(): number {
        return this._idAC;
    }

    public set idAC(value: number) {
        this._idAC = value;
    }

    public get editable(): boolean {
        return this._editable;
    }

    public set editable(value: boolean) {
        this._editable = value;
    }

    public get surf(): SurfFire {
        return this._surf;
    }

    public set surf(value: SurfFire) {
        this._surf = value;
    }

    public get vent(): VentFire {
        return this._vent;
    }

    public set vent(value: VentFire) {
        this._vent = value;
    }

    public toJSON(): object {
        var fire = {
            id: this.id,
            uuid: this.uuid,
            idAC: this.idAC,
            editable: this.editable,
            surf: this.surf.toJSON(),
            vent: this.vent.toJSON()
        }
        return fire;
    }

}
