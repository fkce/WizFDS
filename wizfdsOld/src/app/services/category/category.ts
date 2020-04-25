import { IdGeneratorService } from '../id-generator/id-generator.service';

export interface CategoryInterface {
    uuid: string,
    label: string,
    active: boolean | string,
    visible: boolean | string
}

export class Category {

    private _uuid: string;
    private _label: string;
    private _active: boolean | string;
    private _visible: boolean | string;

    constructor(jsonString: string) {

        let base: CategoryInterface;
        base = <CategoryInterface>JSON.parse(jsonString);

        let idGeneratorService = new IdGeneratorService;

        this.uuid = base['uuid'] || idGeneratorService.genUUID();
        this.label = base['label'] || 'New category';
        this.active = <boolean>base['active'];
        this.visible = <boolean>base['visible'];
    }

    /** Set on/off active */
    public triggerActive() {
        this.active ? this.active = false : this.active = true;
    }

    public get uuid(): string {
        return this._uuid;
    }

    public set uuid(value: string) {
        this._uuid = value;
    }

    public get label(): string {
        return this._label;
    }

    public set label(value: string) {
        this._label = value;
    }

    public get active(): boolean {
        return <boolean>this._active;
    }

    public set active(value: boolean) {
        this._active = value;
    }

    public get visible(): boolean {
        return <boolean>this._visible;
    }

    public set visible(value: boolean) {
        this._visible = value;
    }

    public toJSON(): string {
        let category: CategoryInterface = {
            uuid: this.uuid,
            label: this.label,
            active: this.active,
            visible: this.visible
        }
        return JSON.stringify(category);
    }

}
