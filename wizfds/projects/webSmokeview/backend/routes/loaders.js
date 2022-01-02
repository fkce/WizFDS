const fs = require('fs');
const { execFileSync } = require('child_process');
const { gzip } = require('pako');

var _ = require('lodash');

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

            console.log('smokeview', '-runhtmlscript', chid, { cwd: path });
            execFileSync('smokeview', ['-runhtmlscript', chid], { cwd: path });

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


    let record = false;
    // Get simulation geometry data from already generated json files
    app.get('/api/loadSmvInfo/:path(*)', (req, res) => {

        try {
            var smv = fs.readFileSync(req.params.path).toString().split("\n");
        } catch (err) {
            console.error(err)
        }

        let trnx = [];

        _.forEach(smv, (line, index) => {

            if (/^TRNX/.test(line)) {
                let helpIndex = index;
                let helpLine = ''
                while (helpLine != '\r') {
                    console.log(smv[helpIndex]);
                    let re = /\d+\.\d+/.exec(smv[helpIndex]);
                    console.log(re);
                    trnx.push(re);
                    helpLine = smv[helpIndex + 1];
                    helpIndex = helpIndex + 1;
                }
            }

            if (/^SLCF/.test(line)) {
                console.log(smv[index]);
                console.log(smv[index + 1]);
                console.log(smv[index + 2]);
                console.log(smv[index + 3]);
                console.log(smv[index + 4]);
            }

        });

        console.log(trnx);


    });

}