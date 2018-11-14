import { IdGeneratorService } from '../../id-generator/id-generator.service';
import { Xb, Xyz, Quantity } from '../primitives';
import { FdsEntities } from '../../../enums/fds/entities/fds-entities';
import { Prop } from './prop';
import { Spec } from '../specie/spec';
import { Part } from '../particle/part';
import { FdsGuiEntities } from '../../../enums/fds/entities/fds-gui-entities';
import { get, toString, find, toNumber, toInteger, includes, filter, map } from 'lodash';
import { quantities } from '../../../enums/fds/enums/fds-enums-quantities';

export interface Statistics {
    integral_lower: number,
    integral_upper: number,
    statistics: string
}

export interface DevcInterface {
    id: string,
    uuid: string,
    idAC: number,
    xb: Xb,
    xyz: Xyz,
    type: string,
    geometrical_type: string,
    quantity_type: string,
    quantity: Quantity,
    spec_id: object,
    part_id: object,
    prop_id: object,
    setpoint: number,
    initial_state: boolean,
    latch: boolean,
    trip_direction: number,
    smoothing_factor: number,
    statistics: Statistics
}

export class Devc {
    private _id: string;
    private _uuid: string;
    private _idAC: number;
    private _xb: Xb;
    private _xyz: Xyz;
    private _type: string;
    private _geometrical_type: string;
    private _quantity_type: string;
    private _quantity: Quantity;
    private _spec_id: object;
    private _part_id: object;
    private _prop_id: object;
    private _setpoint: number;
    private _initial_state: boolean;
    private _latch: boolean;
    private _trip_direction: number;
    private _smoothing_factor: number;
    private _statistics: Statistics;

    constructor(jsonString: string, props?: Prop[], specs?: Spec[], parts?: Part[]) {

        let base: DevcInterface;
        base = <DevcInterface>JSON.parse(jsonString);

        let idGeneratorService = new IdGeneratorService;

        let devc = FdsEntities.devc;
        let GUI_DEVC = FdsGuiEntities.DEVC;
        let QUANTITIES = filter(quantities, function (o) { return includes(o.type, 'd') });

        this.id = base.id || '';
        this.uuid = base.uuid || idGeneratorService.genUUID();
        this.idAC = base.idAC || 0;
        this.type = toString(get(base, 'type', GUI_DEVC.TYPE.default[0]));
        this.geometrical_type = toString(get(base, 'geometrical_type', GUI_DEVC.GEOMETRICAL_TYPE.default[0]));
        this.quantity_type = toString(get(base, 'quantity_type'));

        this.quantity = (base.quantity != undefined && toString(base.quantity) != '') ? new Quantity(JSON.stringify(base.quantity)) : undefined;
        if (this.quantity != undefined) {
            this.quantity.specs = this.quantity.specs != undefined && this.quantity.specs.length > 0 ? map(this.quantity.specs, function (o) { return new Spec(JSON.stringify(o)); }) : [];
            this.quantity.parts = this.quantity.parts != undefined && this.quantity.parts.length > 0 ? map(this.quantity.parts, function (o) { return new Part(JSON.stringify(o)); }) : [];
        }

        if (base.prop_id) {
            if (!props) {
                this.prop_id = base.prop_id || {};
            } else {
                var prop = find(props, function (elem) {
                    // TODO ??
                    return elem.id == prop;
                });
                this.prop_id = prop;
            }
        }

        this.xb = new Xb(JSON.stringify(base.xb), 'devc') || new Xb(JSON.stringify({}), 'devc');
        this.xyz = new Xyz(JSON.stringify(base.xyz)) || new Xyz(JSON.stringify({}));

        this.setpoint = toNumber(get(base, 'setpoint', devc.setpoint.default[0]));
        this.initial_state = (get(base, 'initial_state', devc.initial_state.default[0]) == true) as boolean;
        this.latch = (get(base, 'latch', devc.latch.default[0] == true)) as boolean;
        this.trip_direction = toInteger(get(base, 'trip_direction', devc.trip_direction.default[0]));
        this.smoothing_factor = toNumber(get(base, 'smoothing_factor', devc.smoothing_factor.default[0]));
        this.statistics = {
            integral_lower: toNumber(get(base, 'statistics.integral_lower', 0)),
            integral_upper: toNumber(get(base, 'statistics.integral_upper', 0)),
            statistics: get(base, 'statistics.statistics', undefined)
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
     * Getter type
     * @return {string}
     */
    public get type(): string {
        return this._type;
    }

    /**
     * Setter type
     * @param {string} value
     */
    public set type(value: string) {
        this._type = value;
    }

    /**
     * Getter geometrical_type
     * @return {string}
     */
    public get geometrical_type(): string {
        return this._geometrical_type;
    }

    /**
     * Setter geometrical_type
     * @param {string} value
     */
    public set geometrical_type(value: string) {
        this._geometrical_type = value;
    }

    /**
     * Getter quantity_type
     * @return {string}
     */
    public get quantity_type(): string {
        return this._quantity_type;
    }

    /**
     * Setter quantity_type
     * @param {string} value
     */
    public set quantity_type(value: string) {
        this._quantity_type = value;
    }

    /**
     * Getter quantity
     * @return {Quantity}
     */
    public get quantity(): Quantity {
        return this._quantity;
    }

    /**
     * Setter quantity
     * @param {Quantity} value
     */
    public set quantity(value: Quantity) {
        this._quantity = value;
    }

    /**
     * Getter spec_id
     * @return {object}
     */
    public get spec_id(): object {
        return this._spec_id;
    }

    /**
     * Setter spec_id
     * @param {object} value
     */
    public set spec_id(value: object) {
        this._spec_id = value;
    }

    /**
     * Getter part_id
     * @return {object}
     */
    public get part_id(): object {
        return this._part_id;
    }

    /**
     * Setter part_id
     * @param {object} value
     */
    public set part_id(value: object) {
        this._part_id = value;
    }

    /**
     * Getter prop_id
     * @return {object}
     */
    public get prop_id(): object {
        return this._prop_id;
    }

    /**
     * Setter prop_id
     * @param {object} value
     */
    public set prop_id(value: object) {
        this._prop_id = value;
    }

    /**
     * Getter setpoint
     * @return {number}
     */
    public get setpoint(): number {
        return this._setpoint;
    }

    /**
     * Setter setpoint
     * @param {number} value
     */
    public set setpoint(value: number) {
        this._setpoint = value;
    }

    /**
     * Getter initial_state
     * @return {boolean}
     */
    public get initial_state(): boolean {
        return this._initial_state;
    }

    /**
     * Setter initial_state
     * @param {boolean} value
     */
    public set initial_state(value: boolean) {
        this._initial_state = value;
    }

    /**
     * Getter latch
     * @return {boolean}
     */
    public get latch(): boolean {
        return this._latch;
    }

    /**
     * Setter latch
     * @param {boolean} value
     */
    public set latch(value: boolean) {
        this._latch = value;
    }

    /**
     * Getter trip_direction
     * @return {number}
     */
    public get trip_direction(): number {
        return this._trip_direction;
    }

    /**
     * Setter trip_direction
     * @param {number} value
     */
    public set trip_direction(value: number) {
        this._trip_direction = value;
    }

    /**
     * Getter smoothing_factor
     * @return {number}
     */
    public get smoothing_factor(): number {
        return this._smoothing_factor;
    }

    /**
     * Setter smoothing_factor
     * @param {number} value
     */
    public set smoothing_factor(value: number) {
        this._smoothing_factor = value;
    }

    /**
     * Getter statistics
     * @return {StatisticsInterface}
     */
    public get statistics(): Statistics {
        return this._statistics;
    }

    /**
     * Setter statistics
     * @param {StatisticsInterface} value
     */
    public set statistics(value: Statistics) {
        this._statistics = value;
    }

    /**  
     * Export to json
     */
    public toJSON(): object {
        let quantity = this.quantity != undefined ? this.quantity.toJSON() : '';

        let devc: object = {
            id: this.id,
            uuid: this.uuid,
            idAC: this.idAC,
            type: this.type,
            geometrical_type: this.geometrical_type,
            quantity_type: this.quantity_type,
            quantity: quantity,
            prop_id: get(this, 'prop_id.id', undefined),
            setpoint: this.setpoint,
            initial_state: this.initial_state,
            latch: this.latch,
            trip_direction: this.trip_direction,
            spec_id: get(self, 'spec_id.id', undefined),
            part_id: get(self, 'part_id.id', undefined),
            xb: this.xb.toJSON(),
            xyz: this.xyz.toJSON(),
            statistics: this.statistics
        }
        return devc;
    }

}