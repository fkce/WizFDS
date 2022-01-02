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
require('./routes/routes')(app);
require('./routes/loaders')(app);
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
else if (global.gConfig.protocol == 'http') {
  const http = require('http');
  var httpServer = http.createServer(app);
  httpServer.listen(port);
}

// For internal testing
const request = require('supertest');
request(app)
  .get('/api/loadSmvInfo/d:/smokeweb/test-case/test_sym1.smv')
  .expect('Content-Type', /json/)
  .end(function (err, res) {
    if (err) throw err;
    //else console.log(res.body);
  });