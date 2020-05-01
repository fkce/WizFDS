import { Spec } from "./specie/spec";
import { Part } from "./particle/part";

import { get, map, toString, find, forEach, isEqual, round, toNumber } from "lodash";
import { colors } from "@enums/fds/enums/fds-enums-colors";

export interface IXb {
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    z1: number,
    z2: number,
}
export class Xb {
    private _x1: number;
    private _x2: number;
    private _y1: number;
    private _y2: number;
    private _z1: number;
    private _z2: number;

    constructor(jsonString: string, type?: string) {

        let base: IXb;
        if (jsonString != undefined) base = <IXb>JSON.parse(jsonString);

        this.x1 = toNumber(get(base, 'x1', 0));
        this.x2 = toNumber(get(base, 'x2', 1));
        this.y1 = toNumber(get(base, 'y1', 0));
        this.y2 = toNumber(get(base, 'y2', 1));

        if (type == 'vent' || type == 'open' || type == 'devc') {
            this.z1 = toNumber(get(base, 'z1', 0));
            this.z2 = toNumber(get(base, 'z2', 0));
        }
        else {
            this.z1 = toNumber(get(base, 'z1', 0));
            this.z2 = toNumber(get(base, 'z2', 1));
        }
    }

    /**
     * Getter x1
     * @return {number}
     */
    public get x1(): number {
        return this._x1;
    }

    /**
     * Setter x1
     * @param {number} value
     */
    public set x1(value: number) {
        this._x1 = value;
        //this.calcArea();
    }

    /**
     * Getter x2
     * @return {number}
     */
    public get x2(): number {
        return this._x2;
    }

    /**
     * Setter x2
     * @param {number} value
     */
    public set x2(value: number) {
        this._x2 = value;
        //this.calcArea();
    }

    /**
     * Getter y1
     * @return {number}
     */
    public get y1(): number {
        return this._y1;
    }

    /**
     * Setter y1
     * @param {number} value
     */
    public set y1(value: number) {
        this._y1 = value;
        //this.calcArea();
    }

    /**
     * Getter y2
     * @return {number}
     */
    public get y2(): number {
        return this._y2;
    }

    /**
     * Setter y2
     * @param {number} value
     */
    public set y2(value: number) {
        this._y2 = value;
        //this.calcArea();
    }

    /**
     * Getter z1
     * @return {number}
     */
    public get z1(): number {
        return this._z1;
    }

    /**
     * Setter z1
     * @param {number} value
     */
    public set z1(value: number) {
        this._z1 = value;
        //this.calcArea();
    }

    /**
     * Getter z2
     * @return {number}
     */
    public get z2(): number {
        return this._z2;
    }

    /**
     * Setter z2
     * @param {number} value
     */
    public set z2(value: number) {
        this._z2 = value;
        //this.calcArea();
    }

    toJSON(): object {
        let xb: object = {
            x1: this.x1,
            x2: this.x2,
            y1: this.y1,
            y2: this.y2,
            z1: this.z1,
            z2: this.z2
        }
        return xb;
    }
}

export interface IXyz {
    x: number,
    y: number,
    z: number
}
export class Xyz {
    private _x: number;
    private _y: number;
    private _z: number;

    constructor(jsonString: string) {

        let base: IXyz;
        if (jsonString != undefined) base = <IXyz>JSON.parse(jsonString);

        this.x = get(base, 'x', 0);
        this.y = get(base, 'y', 0);
        this.z = get(base, 'z', 0);
    }

    public recalc(xb?: Xb) {

        if (!xb) xb = new Xb(JSON.stringify({}));

        this.x = round(toNumber(xb.x1) + (xb.x2 - xb.x1) / 2, 3);
        this.y = round(toNumber(xb.y1) + (xb.y2 - xb.y1) / 2, 3);
        this.z = round(toNumber(xb.z1) + (xb.z2 - xb.z1) / 2, 3);
    }

    /**
     * Getter x
     * @return {number}
     */
    public get x(): number {
        return this._x;
    }

    /**
     * Setter x
     * @param {number} value
     */
    public set x(value: number) {
        this._x = value;
    }

    /**
     * Getter y
     * @return {number}
     */
    public get y(): number {
        return this._y;
    }

    /**
     * Setter y
     * @param {number} value
     */
    public set y(value: number) {
        this._y = value;
    }

    /**
     * Getter z
     * @return {number}
     */
    public get z(): number {
        return this._z;
    }

    /**
     * Setter z
     * @param {number} value
     */
    public set z(value: number) {
        this._z = value;
    }

    toJSON(): object {
        let xyz: object = {
            x: this.x,
            y: this.y,
            z: this.z
        }
        return xyz;
    }

}

export interface IQuantity {
    id: string,
    quantity: string,
    spec: boolean,
    specs: Spec[],
    part: boolean,
    parts: Part[]
}
export class Quantity {
    private _id: string;
    private _quantity: string;
    private _spec: boolean;
    private _specs: Spec[];
    private _part: boolean;
    private _parts: Part[];

    constructor(jsonString: string) {

        let base: IQuantity;
        base = <IQuantity>JSON.parse(jsonString);

        this.id = toString(get(base, 'id', ''));
        this.quantity = toString(get(base, 'quantity', ''));

        this.spec = (get(base, 'spec', true) == true);
        this.part = (get(base, 'part', true) == true);

        this.specs = base.specs != undefined && base.specs.length > 0 ? map(base.specs, function (o) { return new Spec(JSON.stringify(o)) }) : [];
        this.parts = base.parts != undefined && base.parts.length > 0 ? map(base.parts, function (o) { return new Part(JSON.stringify(o)) }) : [];
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
     * Getter quantity
     * @return {string}
     */
    public get quantity(): string {
        return this._quantity;
    }

    /**
     * Setter quantity
     * @param {string} value
     */
    public set quantity(value: string) {
        this._quantity = value;
    }

    /**
     * Getter spec
     * @return {boolean}
     */
    public get spec(): boolean {
        return this._spec;
    }

    /**
     * Setter spec
     * @param {boolean} value
     */
    public set spec(value: boolean) {
        this._spec = value;
    }

    /**
     * Getter specs
     * @return {Spec[]}
     */
    public get specs(): Spec[] {
        return this._specs;
    }

    /**
     * Setter specs
     * @param {Spec[]} value
     */
    public set specs(value: Spec[]) {
        this._specs = value;
    }

    /**
     * Getter part
     * @return {boolean}
     */
    public get part(): boolean {
        return this._part;
    }

    /**
     * Setter part
     * @param {boolean} value
     */
    public set part(value: boolean) {
        this._part = value;
    }

    /**
     * Getter parts
     * @return {Part[]}
     */
    public get parts(): Part[] {
        return this._parts;
    }

    /**
     * Setter parts
     * @param {Part[]} value
     */
    public set parts(value: Part[]) {
        this._parts = value;
    }

    toJSON(): object {
        let specs = this.specs.length > 0 ? map(this.specs, function (o) { return o.toJSON() }) : [];
        let parts = this.parts.length > 0 ? map(this.parts, function (o) { return o.toJSON() }) : [];

        let quantity: object = {
            id: this.id,
            quantity: this.quantity,
            spec: this.spec,
            specs: specs,
            part: this.part,
            parts: parts
        }
        return quantity;
    }
}

export interface IColor {
    label: string,
    value: string,
    rgb: number[],
    show: boolean
}
export class Color {
    private _label: string;
    private _value: string;
    private _rgb: number[];
    private _show: boolean;

    constructor(jsonString: string, value?: string, rgb?: number[]) {

        let base: IColor;
        base = <IColor>JSON.parse(jsonString);

        // Check if color indicated
        let tmpLabel = 'White';
        let tmpValue = 'WHITE';
        let tmpRgb = [255, 255, 255];
        let tmpShow = true;
        let isRgb = false;
        // If isset value
        if (value != undefined) {
            let tmpColor = find(colors, ['value', value]);
            tmpLabel = tmpColor.label;
            tmpValue = tmpColor.value;
            tmpRgb = tmpColor.rgb;
            tmpShow = tmpColor.show;
        }
        // If isset rgb
        else if (rgb != undefined && rgb.length > 0) {
            // Check if predefined color exists
            forEach(colors, (tmpColor) => {
                if (isEqual(rgb, tmpColor.rgb)) {
                    tmpLabel = tmpColor.label;
                    tmpValue = tmpColor.value;
                    tmpRgb = tmpColor.rgb;
                    tmpShow = tmpColor.show;
                    isRgb = true;
                }
            });
            // If not set RGB
            if (!isRgb) {
                tmpLabel = colors[0].label;
                tmpValue = colors[0].value;
                tmpRgb = rgb;
                tmpShow = colors[0].show;
            }
        }

        this.label = toString(get(base, 'label', tmpLabel));
        this.value = toString(get(base, 'value', tmpValue));

        this.rgb = base.rgb != undefined && base.rgb.length > 0 ? [base.rgb[0], base.rgb[1], base.rgb[2]] : tmpRgb;
        this.show = (get(base, 'show', tmpShow) == true);
    }

    /**
     * Get color from COLORS array
     * @param rgb int[]
     */
    public getColor(rgb: number[]) {
        let tmpColor;
        forEach(colors, (color) => {
            if (isEqual(rgb, color.rgb)) tmpColor = color;
        });
        // Set color with RGB only
        if (tmpColor.rgb == undefined) {
            tmpColor = colors[0];
            tmpColor.rgb = rgb;
        }
        return tmpColor;
    }

    /**
     * Getter label
     * @return {string}
     */
    public get label(): string {
        return this._label;
    }

    /**
     * Setter label
     * @param {string} value
     */
    public set label(value: string) {
        this._label = value;
    }

    /**
     * Getter value
     * @return {string}
     */
    public get value(): string {
        return this._value;
    }

    /**
     * Setter value
     * @param {string} value
     */
    public set value(value: string) {
        this._value = value;
        let color = find(colors, ['value', value]);
        this.label = color.label;
        this.rgb = color.rgb;
        this.show = color.show;
    }

    /**
     * Getter rgb
     * @return {number[]}
     */
    public get rgb(): number[] {
        return this._rgb;
    }

    /**
     * Setter rgb
     * @param {number[]} value
     */
    public set rgb(value: number[]) {
        this._rgb = value;
    }

    /**
     * Getter show
     * @return {boolean}
     */
    public get show(): boolean {
        return this._show;
    }

    /**
     * Setter show
     * @param {boolean} value
     */
    public set show(value: boolean) {
        this._show = value;
    }

    /** Export to JSON */
    toJSON(): object {

        let color: object = {
            value: this.value,
            label: this.label,
            rgb: this.rgb,
            show: this.show
        }
        return color;
    }
}

export interface IVis {
	xbNorm?: Xb,
	colorNorm?: number[]
}