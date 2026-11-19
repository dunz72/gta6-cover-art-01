// Neon Vice — local preview server.
// Serves app/ over plain HTTP on port 8080 so the cover maker can be tried
// in a desktop browser. No uploads, no network calls: every file it serves
// is one of the app's own static files. Run: node serve.ts
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const rootDir = new URL('.', import.meta.url).pathname;
const appDir = join(rootDir, 'app');
const port = Number(process.env.PORT || 8080);

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

const server = createServer((req, res) => {
  const raw = decodeURIComponent((req.url || '/').split('?')[0]);
  const path = raw === '/' ? '/index.html' : raw;
  const file = join(appDir, normalize(path));
  if (!file.startsWith(appDir) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found: ' + path + '\n');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});

server.listen(port, () => {
  console.log('Neon Vice at http://localhost:' + port);
});
