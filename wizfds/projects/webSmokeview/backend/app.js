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
if (process.env.NODE_ENV == 'development') {
  app.use(cors());
}

// Routes
require('./routes/tree')(app);
require('./routes/results')(app);

// Get index.html from public/ directory
app.use(express.static(path.join(__dirname, 'public')));

// Create http/https server - only when started as a server. Required from
// somewhere else (the tests), this file is just the configured app, and the
// routes can be exercised without a port bound under them.
if (require.main === module) {
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
  else if (global.gConfig.protocol == 'http') {
    const http = require('http');
    var httpServer = http.createServer(app);
    httpServer.listen(port);
  }
}

module.exports = app;
