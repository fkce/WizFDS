import { IJetFan, IVent, IColor, IXb, IVis } from '../interfaces';

/**
 * Test data for jetfan visualization
 */

const defaultColor: IColor = {
    label: 'Red',
    value: 'red', 
    rgb: [1, 0, 0],
    show: true
};

const defaultVis: IVis = {
    xbNorm: { x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 },
    colorNorm: [1, 0, 0, 1]
};

export const sampleJetfan: IJetFan = {
    id: 'jetfan_test_01',
    uuid: 'jetfan-uuid-test-01', 
    idAC: 1,
    xb: {
        x1: 2.0,
        x2: 8.0,
        y1: 3.0,
        y2: 5.0,
        z1: 1.0,
        z2: 3.0
    },
    surf: 'INERT',
    elevation: 0,
    direction: '+x',
    color: defaultColor,
    transparency: 0.5,
    vis: defaultVis,
    flow: {
        type: 'velocity',
        velocity: 5.0,
        volume_flow: 0,
        mass_flow: 0
    },
    vent_in: null,  // Will be generated
    vent_out: null  // Will be generated
};

export const sampleVents: IVent[] = [
    {
        id: 'vent_test_01',
        uuid: 'vent-uuid-test-01',
        idAC: 2,
        xb: {
            x1: 0.0,
            x2: 2.0,
            y1: 0.0,
            y2: 2.0,
            z1: 0.0,
            z2: 0.0
        },
        surf_id: 'OPEN',
        elevation: 0,
        color: {
            label: 'Blue',
            value: 'blue',
            rgb: [0, 0, 1],
            show: true
        },
        vis: defaultVis
    },
    {
        id: 'vent_test_02',
        uuid: 'vent-uuid-test-02',
        idAC: 3,
        xb: {
            x1: 5.0,
            x2: 7.0,
            y1: 5.0,
            y2: 7.0,
            z1: 2.0,
            z2: 2.0
        },
        surf_id: 'OPEN',
        elevation: 0,
        color: {
            label: 'Green',
            value: 'green',
            rgb: [0, 1, 0],
            show: true
        },
        vis: defaultVis
    }
];
