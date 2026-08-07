module.exports = function (app) {

    // Serve any file of a case as raw bytes, byte ranges included.
    //
    // The server's whole job is bytes (ADR-0016). Parsing happens in the
    // browser, so a single route covers the `.smv` master file and every
    // result file the format readers of Phase 6 (#149...#155) jump around
    // inside - and those jumps are why ranges matter: a reader takes a header
    // and then seeks to the frame it wants instead of pulling half a gigabyte
    // through itself. `res.sendFile` brings `Range`, 206, `Accept-Ranges` and
    // HEAD with it, all of it already in `send`, so none of that is written
    // here and no dependency was added for it.
    //
    // `root` is the traversal boundary, and it is a tight one: `send` decodes
    // the path first and only then looks for `..` in it, so `%2e%2e` is caught
    // exactly like the plain spelling (403), and a doubly encoded one never
    // becomes a `..` at all - it stays a filename nothing answers to (404).
    //
    // The callback is not optional. Without it a missing file leaves through
    // `next(err)` and comes back as Express' HTML error page; with it, the
    // status `send` worked out is the status the client gets.
    app.get('/api/results/:path(*)', (req, res) => {
        res.sendFile(req.params.path, { root: global.gConfig.pathToSimulations }, (err) => {
            if (err && !res.headersSent) {
                res.status(err.status || 500).end();
            }
        });
    });

}
