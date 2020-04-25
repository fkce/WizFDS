import { FdsEntities } from '../../../enums/fds/entities/fds-entities';
import { IdGeneratorService } from '../../id-generator/id-generator.service';
import { get } from 'lodash';
import { Head } from './head';
import { Time } from './time';
import { Misc } from './misc';
import { Init } from './init';

export interface GeneralObject {
    head: Head,
    time: Time,
    misc: Misc,
    init: Init
}

export class General {

    private _head: Head;
    private _time: Time;
    private _misc: Misc;
    private _init: Init;

    constructor(jsonString: string) {

        let base: GeneralObject;
        base = <GeneralObject>JSON.parse(jsonString);

        this.head = base.head != undefined ? new Head(JSON.stringify(base.head)) : new Head(JSON.stringify({}));
        this.time = base.time != undefined ? new Time(JSON.stringify(base.time)) : new Time(JSON.stringify({}));
        this.misc = base.misc != undefined ? new Misc(JSON.stringify(base.misc)) : new Misc(JSON.stringify({}));
        this.init = base.init != undefined ? new Init(JSON.stringify(base.head)) : new Init(JSON.stringify({}));
    }

    /**
     * Getter head
     * @return {Head}
     */
	public get head(): Head {
		return this._head;
	}

    /**
     * Setter head
     * @param {Head} value
     */
	public set head(value: Head) {
		this._head = value;
	}

    /**
     * Getter time
     * @return {Time}
     */
	public get time(): Time {
		return this._time;
	}

    /**
     * Setter time
     * @param {Time} value
     */
	public set time(value: Time) {
		this._time = value;
	}


    /**
     * Getter misc
     * @return {Misc}
     */
	public get misc(): Misc {
		return this._misc;
	}

    /**
     * Setter misc
     * @param {Misc} value
     */
	public set misc(value: Misc) {
		this._misc = value;
	}

    /**
     * Getter init
     * @return {Init}
     */
	public get init(): Init {
		return this._init;
	}

    /**
     * Setter init
     * @param {Init} value
     */
	public set init(value: Init) {
		this._init = value;
	}

    /** Export to json */
    toJSON(): object {
        let general: object = {
            head: this.head.toJSON(),
            time: this.time.toJSON(),
            misc: this.misc.toJSON(),
            init: this.init.toJSON()
        }
        return general;
    }

}
