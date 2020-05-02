const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
var _ = require('lodash');

// environment & config variables
process.env.NODE_ENV = 'development';
const config = require('./config/config.js');


// Allow cors for development purpose
app.use(cors());

// Routes
require('./routes/routes')(app);
require('./routes/load')(app);
require('./routes/tree')(app);

// Get index.html from public/ directory
app.use(express.static(path.join(__dirname, 'public')));

// Create http/https server
const port = global.gConfig.nodePort;

if (global.gConfig.protocol == 'https') {
    const https = require('https');
    // Https keys
    const options = {
      key: fs.readFileSync(global.gConfig.key),
      cert: fs.readFileSync(global.gConfig.cert)
    };
    var httpsServer = https.createServer(options, app);
    httpsServer.listen(port);
}
else if (global.gConfig.process == 'http') {
    const http = require('http');
    var httpServer = http.createServer(app);
    httpServer.listen(port);
}