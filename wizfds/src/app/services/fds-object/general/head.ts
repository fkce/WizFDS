import { IdGeneratorService } from "../../id-generator/id-generator.service";
import { FdsEntities } from "../../../enums/fds/entities/fds-entities";
import { get } from "lodash";

export interface HeadObject {
    title: string,
    chid: string
}

export class Head {
    private _title: string;
    private _chid: string;

    constructor(jsonString: string) {

        let base: HeadObject;
        base = <HeadObject>JSON.parse(jsonString);

        let idGeneratorService = new IdGeneratorService;
        let head = FdsEntities.head;

        this.title = get(base, 'title', head.title.default[0]);
        this.chid = get(base, 'chid', head.chid.default[0]);
    }

    /**
     * Getter title
     * @return {string}
     */
	public get title(): string {
		return this._title;
	}

    /**
     * Setter title
     * @param {string} value
     */
	public set title(value: string) {
		this._title = value;
	}

    /**
     * Getter chid
     * @return {string}
     */
	public get chid(): string {
		return this._chid;
	}

    /**
     * Setter chid
     * @param {string} value
     */
	public set chid(value: string) {
		this._chid = value;
    }

    /** Export to json */
    public toJSON(): object {
        let head: object = {
            chid: this.chid,
            title: this.title
        }
        return head;
    }
}
