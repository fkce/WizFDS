import { FdsScenario, FdsScenarioInterface } from '../fds-scenario/fds-scenario';
import { forEach } from 'lodash';

export interface ProjectObject {
    id: number,
    name: string,
    description: string,
    category: string,
    fdsScenarios: FdsScenario[],
}

export class Project {
    private _id: number;
    private _name: string;
    private _description: string;
    private _category: string;
    private _fdsScenarios: FdsScenario[];

    constructor(jsonString: string) {

        let base: ProjectObject;
        base = <ProjectObject>JSON.parse(jsonString);

        this._id = base.id || 0;
        this._name = base.name || '';
        this._description = base.description || '';
        this._category = base.category || '';
        this._fdsScenarios = [];
        if (base.fdsScenarios) {
            forEach(base.fdsScenarios, (scenario) => {
                this._fdsScenarios.push(new FdsScenario(JSON.stringify(scenario)));
                //this._fdsScenarios.push(new FdsScenario(JSON.stringify(scenario)));
            });
        }
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
     * Getter category
     * @return {string}
     */
	public get category(): string {
		return this._category;
	}

    /**
     * Setter category
     * @param {string} value
     */
	public set category(value: string) {
		this._category = value;
	}

    /**
     * Getter fdsScenarios
     * @return {FdsScenario[]}
     */
	public get fdsScenarios(): FdsScenario[] {
		return this._fdsScenarios;
	}

    /**
     * Setter fdsScenarios
     * @param {FdsScenario[]} value
     */
	public set fdsScenarios(value: FdsScenario[]) {
		this._fdsScenarios = value;
	}

    /** Return json object to DB */
    public toJSON(): string {
        let project: object = {
            id: this.id,
            name: this.name,
            description: this.description,
            category: this.category
        }
        return JSON.stringify(project);
    }

}
