const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;


//const fs = require('fs');
const path = require('path');
var _ = require('lodash');

// Create https server
const https = require('https');
const http = require('http');

// Allow cors for development purpose
app.use(cors());

require('./routes/routes')(app);
require('./routes/load')(app);
require('./routes/tree')(app);


// Get index.html 
app.use(express.static(path.join(__dirname, 'public')));

// Https keys
//const options = {
//  key: fs.readFileSync('d:/privkey.pem'),
//  cert: fs.readFileSync('d:/fullchain.pem')
//};

//var httpsServer = https.createServer(options, app);
var httpServer = http.createServer(app);

//httpsServer.listen(port);
httpServer.listen(port);