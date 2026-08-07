const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, describe, it } = require('node:test');
const request = require('supertest');

const app = require('../app');

describe('/api/tree', () => {

    let sandbox;

    before(() => {
        sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'wizfds-tree-'));
        fs.mkdirSync(path.join(sandbox, 'demo'), { recursive: true });
        fs.writeFileSync(path.join(sandbox, 'demo', 'demo.smv'), '&HEAD /\n');

        global.gConfig.pathToSimulations = sandbox;
    });

    after(() => {
        fs.rmSync(sandbox, { recursive: true, force: true });
    });

    // Two things at once: the paths are relative to the simulations root, so
    // they can be pasted straight behind `/api/results/`, and the payload is
    // JSON the browser reads as it stands - no gzip-into-a-string on the way.
    it('lists nodes by their path from the simulations root', async () => {
        const response = await request(app).get('/api/tree');

        assert.equal(response.status, 200);
        assert.equal(response.body.meta.status, 'success');

        const root = response.body.data;
        assert.equal(root.path, '');

        const smv = root.children[0].children[0];
        assert.equal(smv.name, 'demo.smv');
        assert.equal(smv.path, 'demo/demo.smv');
    });

    it('answers a null tree when the configured root is not there', async () => {
        global.gConfig.pathToSimulations = path.join(sandbox, 'nowhere');
        try {
            const response = await request(app).get('/api/tree');

            assert.equal(response.status, 200);
            assert.equal(response.body.data, null);
        }
        finally {
            global.gConfig.pathToSimulations = sandbox;
        }
    });
});
