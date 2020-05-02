const fs = require('fs');
const zlib = require('zlib');
const { execFileSync } = require('child_process');
const { pipeline } = require('stream');
const { gzip } = require('pako');

module.exports = function (app) {

    // Get simulation geometry data from smokeview generator
    // smokeview -runhtmlscript script_file.ssf chid_name
    app.get('/api/loadSmv/:path(*)', (req, res) => {

        // Execute smv script 
        let path = req.params.path.match(/.*\//)[0];
        let chid = req.params.path.match(/.*\/(.*)\./)[1];
        let ssf = chid + '.ssf';

        let script = 'RENDERHTMLOBST\n ' + chid + '_obst.json';
        fs.writeFile(path + ssf, script, (err) => {
            if (err) return console.log(err);

            console.log('smokeview', '-runhtmlscript', ssf, chid, { cwd: path });
            execFileSync('smokeview', ['-runhtmlscript', ssf, chid], { cwd: path });

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
    });

    // Get simulation geometry data from already generated json files
    app.get('/api/loadJson/:path(*)', (req, res) => {
        // Read json file and send it back
        fs.readFile(req.params.path, (err, data) => {
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