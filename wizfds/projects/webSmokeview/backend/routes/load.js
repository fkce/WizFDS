const fs = require('fs');
const zlib = require('zlib');
const { execFileSync } = require('child_process');
const { pipeline } = require('stream');
const { gzip } = require('pako');

module.exports = function (app) {

    // Get simulation geometry data
    app.get('/api/loadSim/:path(*)', (req, res) => {

        // Execute smv script 
        let path = req.params.path.match(/.*\//)[0];
        let chid = req.params.path.match(/.*\/(.*)\./)[1];
        let ssf = chid + '.ssf';

        let script = 'RENDERHTMLOBST\n ' + chid + '_obst.json';
        fs.writeFile(path + ssf, script, (err) => {
            if (err) return console.log(err);

            execFileSync('smokeview', ['-runscript', path + chid], { cwd: path });
        });

        // After smv script finish read json file and send it back
        fs.readFile(path + chid + '_obst.json', (err, data) => {
            // TODO: perform error handling
            if (err) throw err;

            result = {
                meta: {
                    status: 'success',
                    from: '',
                    details: ['Getting obst geometry']
                },
                data: gzip(data, { to: 'string' })
            }

            // Send response
            res.send(result);

        });

    });
}