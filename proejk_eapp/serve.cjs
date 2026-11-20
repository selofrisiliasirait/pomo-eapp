const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const port = Number(process.argv[2] || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port tidak valid.');
const files = new Set(['index.html', 'styles.css', 'learning.css', 'learning-core.js', 'data-store.js', 'app.js', 'learning.js']);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const name = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (!files.has(name)) { response.writeHead(404); response.end('Not found'); return; }
  fs.readFile(path.join(__dirname, name), (error, data) => {
    response.writeHead(error ? 500 : 200, { 'Content-Type': (types[path.extname(name)] || 'text/plain') + '; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(error ? 'Read failed' : data);
  });
}).listen(port, '127.0.0.1', () => console.log('Local: http://127.0.0.1:' + port));
