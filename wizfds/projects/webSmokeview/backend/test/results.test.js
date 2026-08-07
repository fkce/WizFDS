const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, describe, it } = require('node:test');
const request = require('supertest');

const app = require('../app');

// What the route promises is not "a file arrives" but the exact shape of the
// exchange the browser's ResultsDirectory was written against: a one-byte
// probe that answers with the whole file's size, and a boundary the client
// cannot talk its way past. Both come out of `send` rather than out of code in
// this repository, which is precisely why they are worth pinning down here -
// nobody would notice them changing under an upgrade otherwise.
describe('/api/results', () => {

    const caseBytes = Buffer.from('&HEAD CHID=\'demo\' /\n&MESH IJK=10,10,10 /\n');

    let sandbox;
    let simulations;

    before(() => {
        // The sandbox holds the simulations root *and* a file next to it, so
        // "outside the root" is a real place a traversal could arrive at.
        sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'wizfds-results-'));
        fs.writeFileSync(path.join(sandbox, 'outside.txt'), 'not yours');

        simulations = path.join(sandbox, 'simulations');
        fs.mkdirSync(path.join(simulations, 'demo'), { recursive: true });
        fs.writeFileSync(path.join(simulations, 'demo', 'demo.smv'), caseBytes);
        // An interrupted run leaves these behind, and the client tells them
        // apart from a broken server by the 416 below.
        fs.writeFileSync(path.join(simulations, 'demo', 'empty.sf'), '');

        global.gConfig.pathToSimulations = simulations;
    });

    after(() => {
        fs.rmSync(sandbox, { recursive: true, force: true });
    });

    it('serves a case file as the bytes on disk', async () => {
        const response = await request(app).get('/api/results/demo/demo.smv');

        assert.equal(response.status, 200);
        assert.deepEqual(response.body, caseBytes);
        assert.equal(response.headers['accept-ranges'], 'bytes');
    });

    it('answers a one-byte probe with 206 and the whole file size in Content-Range', async () => {
        const response = await request(app)
            .get('/api/results/demo/demo.smv')
            .set('Range', 'bytes=0-0');

        assert.equal(response.status, 206);
        assert.equal(response.headers['content-range'], `bytes 0-0/${caseBytes.length}`);
        assert.deepEqual(response.body, caseBytes.subarray(0, 1));
    });

    it('serves an inner byte range, which is how the format readers seek', async () => {
        const response = await request(app)
            .get('/api/results/demo/demo.smv')
            .set('Range', 'bytes=6-10');

        assert.equal(response.status, 206);
        assert.equal(response.headers['content-range'], `bytes 6-10/${caseBytes.length}`);
        assert.deepEqual(response.body, caseBytes.subarray(6, 11));
    });

    it('answers HEAD with the headers and no body', async () => {
        const response = await request(app).head('/api/results/demo/demo.smv');

        assert.equal(response.status, 200);
        assert.equal(response.headers['content-length'], String(caseBytes.length));
        assert.equal(response.headers['accept-ranges'], 'bytes');
        assert.deepEqual(response.body, {});
    });

    it('answers 404 for a file the .smv lists but the run never wrote', async () => {
        const response = await request(app).get('/api/results/demo/demo_01.sf');

        assert.equal(response.status, 404);
    });

    it('refuses to climb out of the simulations root', async () => {
        const response = await request(app).get('/api/results/../outside.txt');

        assert.equal(response.status, 403);
    });

    it('refuses an encoded climb just the same, because send decodes before it looks', async () => {
        const response = await request(app).get('/api/results/%2e%2e/outside.txt');

        assert.equal(response.status, 403);
    });

    it('never turns a doubly encoded climb back into one - it stays a name nothing answers to', async () => {
        const response = await request(app).get('/api/results/%252e%252e/outside.txt');

        assert.equal(response.status, 404);
    });

    // The client reads this as "the file is there and empty" rather than as a
    // server that cannot do ranges - see HttpResultsDirectory.open(). If this
    // ever stops being a 416, that reading is wrong and the library needs to
    // hear about it.
    it('answers 416 with a zero total when the file is empty', async () => {
        const response = await request(app)
            .get('/api/results/demo/empty.sf')
            .set('Range', 'bytes=0-0');

        assert.equal(response.status, 416);
        assert.equal(response.headers['content-range'], 'bytes */0');
    });
});
