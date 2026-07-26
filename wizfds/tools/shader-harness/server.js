/**
 * Static server for the shader harness.
 *
 * Deliberately reproduces the SPA fallback of the Angular dev server and of the
 * production /view/ deployment: any unknown path returns index.html with status
 * 200 instead of a 404. That behaviour is what turned a missing shader include
 * into HTML spliced into GLSL source (see docs/audits/2026-07-26-*.md, finding
 * A2) - so the harness must keep it in order to stay faithful.
 *
 * Usage: node tools/shader-harness/server.js [port]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const WIZFDS = path.resolve(HERE, '..', '..');
const SHADERS = path.join(WIZFDS, 'projects/web-smokeview-lib/src/assets/shaders');
const BABYLON_DIR = path.join(WIZFDS, 'node_modules/babylonjs');
const PORT = Number(process.argv[2]) || 4599;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.wgsl': 'text/plain',
  '.fx': 'text/plain',
  '.json': 'application/json',
};

function preflight() {
  const problems = [];
  if (!fs.existsSync(SHADERS)) problems.push(`shader directory not found: ${SHADERS}`);
  if (!fs.existsSync(path.join(BABYLON_DIR, 'babylon.js'))) {
    problems.push(`babylon.js not found in ${BABYLON_DIR} - run npm install first`);
  }
  if (problems.length) {
    problems.forEach((p) => console.error('ERROR: ' + p));
    process.exit(1);
  }
}

function resolveFile(url) {
  if (url === '/' || url === '/index.html') return path.join(HERE, 'index.html');
  if (url.startsWith('/assets/shaders/')) {
    return path.join(SHADERS, url.slice('/assets/shaders/'.length));
  }
  if (url.startsWith('/babylon/')) {
    return path.join(BABYLON_DIR, url.slice('/babylon/'.length));
  }
  return null;
}

preflight();

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const file = resolveFile(url);

    if (file && fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
      return;
    }

    // SPA fallback - identical to what the Angular dev server does
    console.log(`fallback -> index.html (200)  ${url}`);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(path.join(HERE, 'index.html')).pipe(res);
  })
  .listen(PORT, () => {
    console.log(`shader harness:  http://localhost:${PORT}`);
    console.log(`shaders:         ${SHADERS}`);
  });
