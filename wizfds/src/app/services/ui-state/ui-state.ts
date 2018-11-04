export interface UiStateInterface {
	general: any,
	geometry: any,
	ventilation: any,
	fires: any,
	output: any,
	specie: any,
	parts: any,
	ramps: any,
	projects: any,
	active: string,
	fdsMenu: any,
	listRange: number
}

export class UiState {

	private _general: any;
	private _geometry: any;
	private _ventilation: any;
	private _fires: any;
	private _output: any;
	private _specie: any;
	private _parts: any;
	private _ramps: any;

	private _projects: any;
	private _active: string;

	private _fdsMenu: any;
	private _listRange: number = 200;

	constructor(jsonString: string) {

		let base: UiStateInterface;
		base = <UiStateInterface>JSON.parse(jsonString);

		if (base.fdsMenu != undefined) {
			this.fdsMenu = base.fdsMenu;
		}
		else {
			this.fdsMenu = {
				geometry: false,
				ventilation: false,
				fire: false,
				output: false,
				specie: false
			}
		}

		this.projects = { begin: 0, listRange: 20 };
		this.active = base.active != undefined ? base.active : 'projects';

		this.general = base.general != undefined ? base.general : { tab: 0, list: 0, elementIndex: 0 };

		this.geometry = base.geometry != undefined ? base.geometry : {
			tab: 0,
			mesh: { scrollPosition: 0, begin: 0, elementIndex: 0, help: 'closed' },
			open: { scrollPosition: 0, begin: 0, elementIndex: 0, help: 'closed' },
			matl: { scrollPosition: 0, begin: 0, elementIndex: 0, lib: 'closed', help: 'closed' },
			libMatl: { scrollPosition: 0, begin: 0, elementIndex: 0 },
			surf: { scrollPosition: 0, begin: 0, elementIndex: 0, lib: 'closed', help: 'closed' },
			libSurf: { scrollPosition: 0, begin: 0, elementIndex: 0 },
			obst: { scrollPosition: 0, begin: 0, elementIndex: 0, help: 'closed' },
			hole: { scrollPosition: 0, begin: 0, elementIndex: 0 }
		};

		this.ventilation = base.ventilation != undefined ? base.ventilation : {
			surf: { scrollPosition: 0, begin: 0, elementIndex: 0, lib: 'closed', help: 'closed' },
			libSurf: { scrollPosition: 0, begin: 0, elementIndex: 0 },
			vent: { scrollPosition: 0, begin: 0, elementIndex: 0, help: 'closed' },
			jetfan: { scrollPosition: 0, begin: 0, elementIndex: 0, lib: 'closed', help: 'closed' },
			libJetfan: { scrollPosition: 0, begin: 0, elementIndex: 0, }
		};

		this.fires = base.fires != undefined ? base.fires : {
			tab: 0,
			fire: { scrollPosition: 0, begin: 0, elementIndex: 0, lib: 'closed', help: 'closed' },
			libFire: { scrollPosition: 0, begin: 0, elementIndex: 0 },
			fuel: { scrollPosition: 0, begin: 0, elementIndex: 0, lib: 'closed', help: 'closed' },
			libFuel: { scrollPosition: 0, begin: 0, elementIndex: 0 },
		};

		this.output = base.output != undefined ? base.output : {
			tab: 0,
			slcf: { scrollPosition: 0, begin: 0, elementIndex: 0, lib: 'closed', help: 'closed' },
			libSlcf: { scrollPosition: 0, begin: 0, elementIndex: 0, },
			isof: { scrollPosition: 0, begin: 0, elementIndex: 0, lib: 'closed', help: 'closed' },
			libIsof: { scrollPosition: 0, begin: 0, elementIndex: 0, },
			prop: { scrollPosition: 0, begin: 0, elementIndex: 0, lib: 'closed', help: 'closed' },
			libProp: { scrollPosition: 0, begin: 0, elementIndex: 0 },
			devc: { scrollPosition: 0, begin: 0, elementIndex: 0, lib: 'closed', help: 'closed' },
			libDevc: { scrollPosition: 0, begin: 0, elementIndex: 0 },
			ctrl: { scrollPosition: 0, begin: 0, elementIndex: 0, help: 'closed' }
		};

		this.specie = base.specie != undefined ? base.specie : {
			tab: 0,
			spec: { scrollPosition: 0, begin: 0, elementIndex: 0, lib: 'closed', help: 'closed' },
			libSpec: { scrollPosition: 0, begin: 0, elementIndex: 0, help: 'closed' },
			vent: { scrollPosition: 0, begin: 0, elementIndex: 0, lib: 'closed', help: 'closed' },
			libVent: { scrollPosition: 0, begin: 0, elementIndex: 0, help: 'closed' },
			surf: { scrollPosition: 0, begin: 0, elementIndex: 0, lib: 'closed', help: 'closed' },
			libSurf: { scrollPosition: 0, begin: 0, elementIndex: 0, help: 'closed' }
		};

		this.parts = base.parts != undefined ? base.parts : {
			tab: 0,
			part: { scrollPosition: 0, begin: 0, elementIndex: 0, lib: 'closed', help: 'closed' },
			libPart: { scrollPosition: 0, begin: 0, elementIndex: 0 }
		};

		this.ramps = base.ramps != undefined ? base.ramps : {
			tab: 0,
			ramp: { scrollPosition: 0, begin: 0, elementIndex: 0, lib: 'closed', help: 'closed' },
			libRamp: { scrollPosition: 0, begin: 0, elementIndex: 0 }
		};
	}

    /**
     * Getter general
     * @return {any}
     */
	public get general(): any {
		return this._general;
	}

    /**
     * Setter general
     * @param {any} value
     */
	public set general(value: any) {
		this._general = value;
	}

    /**
     * Getter geometry
     * @return {any}
     */
	public get geometry(): any {
		return this._geometry;
	}

    /**
     * Setter geometry
     * @param {any} value
     */
	public set geometry(value: any) {
		this._geometry = value;
	}

    /**
     * Getter ventilation
     * @return {any}
     */
	public get ventilation(): any {
		return this._ventilation;
	}

    /**
     * Setter ventilation
     * @param {any} value
     */
	public set ventilation(value: any) {
		this._ventilation = value;
	}

    /**
     * Getter fires
     * @return {any}
     */
	public get fires(): any {
		return this._fires;
	}

    /**
     * Setter fires
     * @param {any} value
     */
	public set fires(value: any) {
		this._fires = value;
	}

    /**
     * Getter output
     * @return {any}
     */
	public get output(): any {
		return this._output;
	}

    /**
     * Setter output
     * @param {any} value
     */
	public set output(value: any) {
		this._output = value;
	}

    /**
     * Getter specie
     * @return {any}
     */
	public get specie(): any {
		return this._specie;
	}

    /**
     * Setter specie
     * @param {any} value
     */
	public set specie(value: any) {
		this._specie = value;
	}

    /**
     * Getter parts
     * @return {any}
     */
	public get parts(): any {
		return this._parts;
	}

    /**
     * Setter parts
     * @param {any} value
     */
	public set parts(value: any) {
		this._parts = value;
	}

    /**
     * Getter ramps
     * @return {any}
     */
	public get ramps(): any {
		return this._ramps;
	}

    /**
     * Setter ramps
     * @param {any} value
     */
	public set ramps(value: any) {
		this._ramps = value;
	}

    /**
     * Getter fdsMenu
     * @return {any}
     */
	public get fdsMenu(): any {
		return this._fdsMenu;
	}

    /**
     * Setter fdsMenu
     * @param {any} value
     */
	public set fdsMenu(value: any) {
		this._fdsMenu = value;
	}

    /**
     * Getter listRange
     * @return {number }
     */
	public get listRange(): number {
		return this._listRange;
	}

    /**
     * Setter listRange
     * @param {number } value
     */
	public set listRange(value: number) {
		this._listRange = value;
	}

    /**
     * Getter projects
     * @return {any}
     */
	public get projects(): any {
		return this._projects;
	}

    /**
     * Setter projects
     * @param {any} value
     */
	public set projects(value: any) {
		this._projects = value;
	}

    /**
     * Getter active
     * @return {string}
     */
	public get active(): string {
		return this._active;
	}

    /**
     * Setter active
     * @param {string} value
     */
	public set active(value: string) {
		this._active = value;
	}

    /**
     * Export to json
     */
	public toJSON(): object {
		let uiState: object = {
			general: this.general,
			geometry: this.geometry,
			ventilation: this.ventilation,
			fires: this.fires,
			output: this.output,
			specie: this.specie,
			parts: this.parts,
			ramps: this.ramps,
			projects: this.projects,
			active: 'projects',
			fdsMenu: this.fdsMenu,
			listRange: this.listRange
		}
		return uiState;
	}
}
