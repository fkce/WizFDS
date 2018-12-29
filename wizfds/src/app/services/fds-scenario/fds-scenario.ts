import { Fds } from '../fds-object/fds-object';
import { UiState } from '../ui-state/ui-state';

export interface FdsScenarioInterface {
    id: number,
    projectId: number,
    name: string,
    description: string,
    fdsFile: string,
    fdsObject: Fds,
    acFile: string,
    acPath: string,
    uiState: string
}

export class FdsScenario {
    private _id: number;
    private _projectId: number;
    private _name: string;
    private _description: string;
    private _fdsFile: string;
    private _fdsObject: Fds;
    private _acFile: string;
    private _acPath: string;
    private _uiState: UiState;

    constructor(jsonString: string) {

        let base: FdsScenarioInterface;
        base = <FdsScenarioInterface>JSON.parse(jsonString);

        this.id = base.id || 0;
        this.projectId = base.projectId || 0;
        this.name = base.name || '';
        this.description = base.description || '';
        this.fdsFile = base.fdsFile || '';

        if (base.fdsObject) {
            this.fdsObject = new Fds(JSON.stringify(base.fdsObject));
        }
        else {
            this.fdsObject = new Fds('{}');
        }

        this.acFile = base.acFile || '';
        this.acPath = base.acPath || '';

        this.uiState = base.uiState != undefined ? new UiState(JSON.stringify(base.uiState)) : new UiState(JSON.stringify('{}'));
        
    }

    /**
     * Getter id
     * @return {number}
     */
    public get id(): number {
        return this._id;
    }

    /**
     * Setter id
     * @param {number} value
     */
    public set id(value: number) {
        this._id = value;
    }

    /**
     * Getter projectId
     * @return {number}
     */
    public get projectId(): number {
        return this._projectId;
    }

    /**
     * Setter projectId
     * @param {number} value
     */
    public set projectId(value: number) {
        this._projectId = value;
    }

    /**
     * Getter name
     * @return {string}
     */
    public get name(): string {
        return this._name;
    }

    /**
     * Setter name
     * @param {string} value
     */
    public set name(value: string) {
        this._name = value;
    }

    /**
     * Getter description
     * @return {string}
     */
    public get description(): string {
        return this._description;
    }

    /**
     * Setter description
     * @param {string} value
     */
    public set description(value: string) {
        this._description = value;
    }

    /**
     * Getter fdsFile
     * @return {string}
     */
    public get fdsFile(): string {
        return this._fdsFile;
    }

    /**
     * Setter fdsFile
     * @param {string} value
     */
    public set fdsFile(value: string) {
        this._fdsFile = value;
    }

    /**
     * Getter fdsObject
     * @return {Fds}
     */
    public get fdsObject(): Fds {
        return this._fdsObject;
    }

    /**
     * Setter fdsObject
     * @param {Fds} value
     */
    public set fdsObject(value: Fds) {
        this._fdsObject = value;
    }

    /**
     * Getter acFile
     * @return {string}
     */
    public get acFile(): string {
        return this._acFile;
    }

    /**
     * Setter acFile
     * @param {string} value
     */
    public set acFile(value: string) {
        this._acFile = value;
    }

    /**
     * Getter acPath
     * @return {string}
     */
    public get acPath(): string {
        return this._acPath;
    }

    /**
     * Setter acPath
     * @param {string} value
     */
    public set acPath(value: string) {
        this._acPath = value;
    }

    /**
     * Getter uiState
     * @return {UiState}
     */
    public get uiState(): UiState {
        return this._uiState;
    }

    /**
     * Setter uiState
     * @param {UiState} value
     */
    public set uiState(value: UiState) {
        this._uiState = value;
    }

    /**
     * Export to json
     */
    public toJSON(): object {
        let fdsScenario: object = {
            id: this.id,
            projectId: this.projectId,
            name: this.name,
            description: this.description,
            fdsFile: this.fdsFile,
            fdsObject: this.fdsObject.toJSON(),
            acFile: this.acFile,
            acPath: this.acPath,
            uiState: this.uiState.toJSON()
        }
        return fdsScenario;
    }

}
