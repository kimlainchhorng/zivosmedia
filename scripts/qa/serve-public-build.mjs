import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../dist/', import.meta.url));
const manifest = JSON.parse(await fs.readFile(path.join(root, '_prerender/manifest.json'), 'utf8'));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const eligible = !['p','code','error','error_description','access_token','refresh_token'].some(key => url.searchParams.has(key));
    const prerender = eligible && manifest[`${url.pathname}?lang=${url.searchParams.get('lang') === 'km' ? 'km' : 'en'}`];
    let file = prerender ? path.join(root, prerender) : path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    let body;
    try { body = await fs.readFile(file); } catch { file = path.join(root, 'index.html'); body = await fs.readFile(file); }
    const type = prerender ? types['.html'] : types[path.extname(file)] || 'application/octet-stream';
    const gzip = /gzip/.test(req.headers['accept-encoding'] || '');
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store', ...(gzip ? {'Content-Encoding':'gzip'} : {}) });
    res.end(gzip ? gzipSync(body) : body);
  } catch { res.writeHead(500).end(); }
}).listen(5202, '127.0.0.1', () => console.log('Public build ready: http://127.0.0.1:5202'));
