import { IdGeneratorService } from "../../id-generator/id-generator.service";
import { FdsEntities } from "../../../enums/fds/entities/fds-entities";
import { get } from "lodash";

export interface InitObject {

}

export class Init {

    constructor(jsonString: string) {

        let base: InitObject;
        base = <InitObject>JSON.parse(jsonString);

        let idGeneratorService = new IdGeneratorService;
        let init = FdsEntities.init;
    }

    /** Export to json */
    public toJSON(): object {
        let init: object = {

        }
        return init;
    }
}
