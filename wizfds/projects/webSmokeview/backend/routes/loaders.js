const fs = require('fs');
const { gzip } = require('pako');

module.exports = function (app) {

    // Serve the raw .smv master file of a simulation, as FDS wrote it.
    //
    // Parsing happens in the browser (#115, ADR-0016) - the server's whole job
    // is bytes. This replaced shelling out to `smokeview -runhtmlscript`, whose
    // JSON export carried obsts only and dropped the metres.
    app.get('/api/loadSmv/:path(*)', (req, res) => {
        fs.readFile(req.params.path, (err, data) => {
            if (err) {
                res.status(404).send({
                    meta: {
                        status: 'error',
                        from: '',
                        details: ['Cannot read ' + req.params.path]
                    },
                    data: null
                });
                return;
            }

            res.send({
                meta: {
                    status: 'success',
                    from: '',
                    details: ['Serving the .smv master file']
                },
                data: gzip(data, { to: 'string' })
            });
        });
    });

}
