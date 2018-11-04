import { Project } from '@services/project/project';
import { FdsScenario } from '@services/fds-scenario/fds-scenario';
import { Category } from '@services/category/category';
import { environment } from '@env/environment'

export interface WebsocketInterface {
    host: string,
    port: number
}
export interface MainInterface {
    userId: number,
    userName: string,
    editor: string,
    projects: Project[],
    websocket: WebsocketInterface,
    timeout: number,
    currentProject: Project,
    currentFdsScenario: FdsScenario,
    categories: Category[],
    hostAddres: string,
    email: string,
    showTooltips: boolean
}
export class Main {
    private _userId: number;
    private _userName: string;
    private _editor: string;
    private _projects: Project[];
    private _websocket: WebsocketInterface;
    private _timeout: number;
    private _currentProject: Project;
    private _currentFdsScenario: FdsScenario;
    private _categories: Category[];
    private _hostAddres: string;
    private _email: string;
    private _progress: boolean;
    private _showTooltips: boolean;

    constructor(jsonString: string) {

        let base: MainInterface;
        base = <MainInterface>JSON.parse(jsonString);

        this.userId = base.userId || undefined;
        this.userName = base.userName || undefined;
        this.editor = base.editor || "normal";
        this.projects = [];
        this.websocket = base.websocket || {
            host: "localhost",
            port: 2012,
        };
        this.timeout = base.timeout || 3600;
        this.currentProject = base.currentProject || undefined;
        this.currentFdsScenario = base.currentFdsScenario || undefined;
        this.categories = [];
        this.hostAddres = base.hostAddres || environment.host;
        this.email = base.email || '';
        this.showTooltips = base.showTooltips || true;
    }

    /**
     * Getter userId
     * @return {number}
     */
    public get userId(): number {
        return this._userId;
    }

    /**
     * Setter userId
     * @param {number} value
     */
    public set userId(value: number) {
        this._userId = value;
    }

    /**
     * Getter userName
     * @return {string}
     */
    public get userName(): string {
        return this._userName;
    }

    /**
     * Setter userName
     * @param {string} value
     */
    public set userName(value: string) {
        this._userName = value;
    }

    /**
     * Getter editor
     * @return {string}
     */
    public get editor(): string {
        return this._editor;
    }

    /**
     * Setter editor
     * @param {string} value
     */
    public set editor(value: string) {
        this._editor = value;
    }

    /**
     * Getter projects
     * @return {Project[]}
     */
    public get projects(): Project[] {
        return this._projects;
    }

    /**
     * Setter projects
     * @param {Project[]} value
     */
    public set projects(value: Project[]) {
        this._projects = value;
    }

    /**
     * Getter websocket
     * @return {WebsocketInterface}
     */
    public get websocket(): WebsocketInterface {
        return this._websocket;
    }

    /**
     * Setter websocket
     * @param {WebsocketInterface} value
     */
    public set websocket(value: WebsocketInterface) {
        this._websocket = value;
    }

    /**
     * Getter timeout
     * @return {number}
     */
    public get timeout(): number {
        return this._timeout;
    }

    /**
     * Setter timeout
     * @param {number} value
     */
    public set timeout(value: number) {
        this._timeout = value;
    }

    /**
     * Getter currentProject
     * @return {Project}
     */
    public get currentProject(): Project {
        return this._currentProject;
    }

    /**
     * Setter currentProject
     * @param {Project} value
     */
    public set currentProject(value: Project) {
        this._currentProject = value;
    }

    /**
     * Getter currentFdsScenario
     * @return {FdsScenario}
     */
    public get currentFdsScenario(): FdsScenario {
        return this._currentFdsScenario;
    }

    /**
     * Setter currentFdsScenario
     * @param {FdsScenario} value
     */
    public set currentFdsScenario(value: FdsScenario) {
        this._currentFdsScenario = value;
    }

    /**
     * Getter categories
     * @return {Category[]}
     */
    public get categories(): Category[] {
        return this._categories;
    }

    /**
     * Setter categories
     * @param {Category[]} value
     */
    public set categories(value: Category[]) {
        this._categories = value;
    }

    /**
     * Getter hostAddres
     * @return {string}
     */
    public get hostAddres(): string {
        return this._hostAddres;
    }

    /**
     * Setter hostAddres
     * @param {string} value
     */
    public set hostAddres(value: string) {
        this._hostAddres = value;
    }

    /**
     * Getter email
     * @return {string}
     */
    public get email(): string {
        return this._email;
    }

    /**
     * Setter email
     * @param {string} value
     */
    public set email(value: string) {
        this._email = value;
    }

    /**
     * Getter showTooltips
     * @return {boolean}
     */
	public get showTooltips(): boolean {
		return this._showTooltips;
	}

    /**
     * Setter showTooltips
     * @param {boolean} value
     */
	public set showTooltips(value: boolean) {
		this._showTooltips = value;
	}

}
