import { Project } from '@services/project/project';
import { FdsScenario } from '@services/fds-scenario/fds-scenario';
import { Category } from '@services/category/category';
import { environment } from '@env/environment';

import { toString } from 'lodash';

export interface WebsocketInterface {
    host: string,
    port: number
}
export interface ISettings {
    userName: string;
    email: string,
    editor: string,
    hostAddress: string,
    tooltips: boolean
}
export interface IAutoSave {
    fdsObjectDiffer: object,
    fdsObjectSaveFont: string,
    timeout: any,
    timeoutScenarioId: number
}
export interface IIdle {
    timeout: number,
}
export interface IMain {
    userId: number,
    websocket: WebsocketInterface,
    projects?: Project[],
    currentProject?: Project,
    currentFdsScenario?: FdsScenario,
    categories?: Category[],
    settings: ISettings,
    autoSave: IAutoSave,
    idle: IIdle
}

export class Main {
    private _userId: number;
    private _websocket: WebsocketInterface;
    private _projects: Project[];
    private _currentProject: Project;
    private _currentFdsScenario: FdsScenario;
    private _categories: Category[];
    private _settings: ISettings;
    private _autoSave: IAutoSave;
    private _idle: IIdle;

    constructor(jsonString: string) {

        let base: any = JSON.parse(jsonString);

        this.userId = base.userId || undefined;

        this.websocket = {
            host: (base.websocketHost != undefined && base.websocketHost != '') ? base.websocketHost : 'localhost',
            port: (base.websocketPort != undefined && base.websocketPort != '') ? base.websocketPort : 2012
        }

        this.projects = [];
        this.currentProject = base.currentProject || undefined;
        this.currentFdsScenario = base.currentFdsScenario || undefined;
        this.categories = [];

        this.settings = {
            userName: base.userName || '',
            editor: base.editor || 'normal',
            hostAddress: base.hostAddress || environment.host,
            email: base.email || '',
            tooltips: (toString(base.tooltips) == 't' || base.tooltips == true) ? true : false
        }

        this.autoSave = {
            fdsObjectDiffer: null,
            fdsObjectSaveFont: 'mdi mdi-content-save',
            timeout: null,
            timeoutScenarioId: 0
        }

        this.idle = {
            timeout: base.timeout || 3600,
        }

    }

    /**
     * Export to json
     */
    public toJSON(): string {
        let main = {
            userId: this.userId,
            userName: this.settings.userName,
            editor: this.settings.editor,
            websocket: this.websocket,
            timeout: this.idle.timeout,
            hostAddres: this.settings.hostAddress,
            email: this.settings.email,
            tooltips: (this.settings.tooltips) ? 'true' : 'false'
        }
        return JSON.stringify(main);
    }

    /**
     * Getter userId
     * @return {number}
     */
    public get userId(): number {
        return this._userId;
    }

    /**
     * Getter websocket
     * @return {WebsocketInterface}
     */
    public get websocket(): WebsocketInterface {
        return this._websocket;
    }

    /**
     * Getter projects
     * @return {Project[]}
     */
    public get projects(): Project[] {
        return this._projects;
    }

    /**
     * Getter currentProject
     * @return {Project}
     */
    public get currentProject(): Project {
        return this._currentProject;
    }

    /**
     * Getter currentFdsScenario
     * @return {FdsScenario}
     */
    public get currentFdsScenario(): FdsScenario {
        return this._currentFdsScenario;
    }

    /**
     * Getter categories
     * @return {Category[]}
     */
    public get categories(): Category[] {
        return this._categories;
    }

    /**
     * Getter settings
     * @return {ISettings}
     */
    public get settings(): ISettings {
        return this._settings;
    }

    /**
     * Getter autoSave
     * @return {IAutoSave}
     */
    public get autoSave(): IAutoSave {
        return this._autoSave;
    }

    /**
     * Getter idle
     * @return {IIdle}
     */
    public get idle(): IIdle {
        return this._idle;
    }

    /**
     * Setter userId
     * @param {number} value
     */
    public set userId(value: number) {
        this._userId = value;
    }

    /**
     * Setter websocket
     * @param {WebsocketInterface} value
     */
    public set websocket(value: WebsocketInterface) {
        this._websocket = value;
    }

    /**
     * Setter projects
     * @param {Project[]} value
     */
    public set projects(value: Project[]) {
        this._projects = value;
    }

    /**
     * Setter currentProject
     * @param {Project} value
     */
    public set currentProject(value: Project) {
        this._currentProject = value;
    }

    /**
     * Setter currentFdsScenario
     * @param {FdsScenario} value
     */
    public set currentFdsScenario(value: FdsScenario) {
        this._currentFdsScenario = value;
    }

    /**
     * Setter categories
     * @param {Category[]} value
     */
    public set categories(value: Category[]) {
        this._categories = value;
    }

    /**
     * Setter settings
     * @param {ISettings} value
     */
    public set settings(value: ISettings) {
        this._settings = value;
    }

    /**
     * Setter autoSave
     * @param {IAutoSave} value
     */
    public set autoSave(value: IAutoSave) {
        this._autoSave = value;
    }

    /**
     * Setter idle
     * @param {IIdle} value
     */
    public set idle(value: IIdle) {
        this._idle = value;
    }

}