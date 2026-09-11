#!/usr/bin/env node
/** Read-only browser regression: a controlled PWA must not pin online visitors to old HTML. */
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
let revision = 'before';
const types = { '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const file = path.resolve(dist, '.' + decodeURIComponent(url.pathname));
    if (file !== path.resolve(dist) && !file.startsWith(dist)) { response.writeHead(403).end(); return; }
    let data, html = false;
    try { data = await fs.readFile(file); html = path.extname(file) === '.html'; }
    catch { data = await fs.readFile(path.join(dist, 'index.html')); html = true; }
    if (html) data = data.toString().replace('</head>', `<meta name="zivo-release-proof" content="${revision}"></head>`);
    response.writeHead(200, { 'Content-Type': html ? 'text/html' : types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(data);
  } catch { response.writeHead(500).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  const page = await context.newPage();
  await page.goto(origin + '/?lang=en');
  await page.locator('h1').waitFor({ timeout: 60000 });
  await page.evaluate(async () => { await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), undefined, { timeout: 60000 });
  revision = 'after';
  await page.goto(origin + '/?lang=km');
  const online = await page.locator('meta[name="zivo-release-proof"]').getAttribute('content');
  if (online !== 'after') throw new Error('The existing service worker served stale online HTML.');
  await page.locator('h1').waitFor({ timeout: 60000 });
  await context.setOffline(true);
  await page.goto(origin + '/?offline-check=1', { waitUntil: 'domcontentloaded' });
  const offline = await page.locator('meta[name="zivo-release-proof"]').getAttribute('content');
  if (offline !== 'before') throw new Error('The offline cached-shell fallback was not preserved.');
  console.log('PASS: controlled PWA receives changed HTML online and cached shell offline.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
