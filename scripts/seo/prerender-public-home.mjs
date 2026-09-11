import { build, transform } from 'esbuild';
import { compile } from '@tailwindcss/node';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
const output = path.join(root, 'node_modules/.cache/zivo-home-prerender.mjs');
await mkdir(path.dirname(output), { recursive: true });
try {
  await build({ stdin: { contents: `import React from 'react'; import {renderToString} from 'react-dom/server'; import View from './src/pages/CambodiaHomeView'; import GuideView from './src/pages/CambodiaGuideView'; import {cambodiaGuides,travelFaqs} from './src/content/cambodiaGuides'; import {mediaPublicSeoHtml,mediaPrerenderAsset} from './cloudflare/media-public-seo'; export const paths = ['/',...cambodiaGuides.map(g=>g.path)]; export const render = (km,path) => renderToString(path==='/' ? React.createElement('div',null,React.createElement(View,{km})) : React.createElement(GuideView,{km,guide:cambodiaGuides.find(g=>g.path===path)})); export {mediaPublicSeoHtml,mediaPrerenderAsset,travelFaqs};`, resolveDir: root, loader: 'tsx' }, bundle: true, platform: 'node', format: 'esm', packages: 'external', outfile: output, jsx: 'automatic' });
  const { render, mediaPublicSeoHtml, mediaPrerenderAsset, paths, travelFaqs } = await import(pathToFileURL(output).href);
  const appShell = await readFile(path.join(root, 'dist/index.html'), 'utf8');
  // Prerendered content must remain visible when JavaScript is disabled.
  const shell = appShell.replace(/<div data-zivo-boot-shell\b[\s\S]*?<\/div>\s*<\/div>/, '');
  if (shell.includes('<div data-zivo-boot-shell')) throw new Error('Public prerender still contains the app loading overlay.');
  if (!shell.includes('<div id="root"></div>')) throw new Error('Prerender requires the expected root element.');
  await mkdir(path.join(root, 'dist/_prerender'), { recursive: true });
  // Only the classes present in public HTML are critical. Keep the full app
  // stylesheet available asynchronously for dialogs and subsequent app boot.
  const classes = new Set();
  for (const pagePath of paths) for (const km of [false, true]) {
    for (const match of render(km, pagePath).matchAll(/class="([^"]+)"/g)) for (const name of match[1].split(/\s+/)) classes.add(name);
  }
  const cssCompiler = await compile('@import "tailwindcss" source(none);', { base: root, onDependency() {} });
  const typography = await readFile(path.join(root, 'src/index.css'), 'utf8');
  // Slice the whole Khmer typography section by explicit markers. This used to
  // end at `html[lang="km"] textarea {` and re-join that rule separately, which
  // silently excluded every Khmer rule written after it — the 15px legibility
  // floor shipped inert that way, because the prerendered pages load the full
  // stylesheet deferred and render from this critical CSS alone.
  const khmerStart = typography.indexOf('html[lang="km"],');
  const khmerEnd = typography.indexOf('/* ── end Khmer typography ──');
  if (khmerStart < 0 || khmerEnd < 0 || khmerEnd < khmerStart) {
    throw new Error('src/index.css is missing the Khmer typography start selector or its end marker; critical CSS would drop Khmer sizing.');
  }
  const khmerTypography = typography.slice(khmerStart, khmerEnd);
  // Every Khmer rule now lives inside the slice; nothing is re-joined after it.
  const khmerInputs = '';
  const critical = (await transform(cssCompiler.build([...classes]) + '\n.bg-ig-gradient{background-image:linear-gradient(45deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)}\n' + khmerTypography + khmerInputs, { loader: 'css', minify: true })).code;
  if (critical.length > 80000) throw new Error('Public critical CSS unexpectedly exceeds 80 KB.');
  // Prove the Khmer sizing actually made it in, rather than trusting the slice.
  // Khmer stacks diacritics above and below the baseline, so the Latin 14px is
  // not merely small here, it is hard to read; and these pages render from this
  // CSS alone until the deferred stylesheet lands.
  for (const [needle, what] of [['html[lang=km] .text-sm', 'the 15px legibility floor'], ['html[lang=km] textarea', 'the input/textarea rules']]) {
    if (!critical.replace(/lang="km"/g, 'lang=km').includes(needle)) {
      throw new Error(`Public critical CSS is missing ${what} (${needle}). Khmer would render at the Latin size until the deferred stylesheet loads. Check the markers in src/index.css.`);
    }
  }
  const manifest = {};
  for (const pagePath of paths) for (const language of ['en', 'km']) {
    const content = render(language === 'km', pagePath);
    const url = new URL(`https://zivosmedia.com${pagePath}?lang=${language}`);
    let html = mediaPublicSeoHtml(shell.replace('<div id="root"></div>', `<div id="root" data-prerendered="true" data-prerender-language="${language}">${content}</div>`), url);
    html = html.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, tag => tag.includes('/assets/') ? tag.replace('<link', '<link data-zivo-deferred-style media="print"').replace('href=', pagePath === '/' ? 'data-href=' : 'href=') : tag);
    if (pagePath === '/') {
      const entry = html.match(/<script\b[^>]*type="module"[^>]*src="(\/assets\/index-[^"]+\.js)"[^>]*><\/script>/);
      if (!entry || !/^\/assets\/index-[A-Za-z0-9_-]+\.js$/.test(entry[1])) throw new Error('Public enhancement requires the built module entry.');
      html = html.replace(entry[0], `<script defer src="/public-home-boot.js" data-zivo-entry="${entry[1]}"></script>`)
        .replace(/<link\b[^>]*rel="modulepreload"[^>]*>/g, '');
    }
    if (pagePath === '/') html = html.replace(/<link\b[^>]*href="https:\/\/fonts\.googleapis\.com[^"]*family=Inter[^"]*"[^>]*>/g, '');
    html = html.replace('</head>', `<style data-zivo-public-critical>${critical}</style><script defer src="/public-page-styles.js"></script></head>`);
    if (language === 'km') {
      const fontCss = await readFile(path.join(root, 'public/fonts/noto-sans-khmer.css'), 'utf8');
      const khmerFont = fontCss.match(/url\(([^)]+)\)/)[1];
      html = html.replace('</head>', `<style id="zivo-khmer-font">${fontCss}</style><link rel="preload" as="font" type="font/woff2" crossorigin href="${khmerFont}"></head>`);
    }
    if (pagePath !== '/') {
      const i = language === 'km' ? 1 : 0;
      const schema = { '@context':'https://schema.org', '@type':'FAQPage', mainEntity:travelFaqs.map(faq=>({'@type':'Question',name:faq.question[i],acceptedAnswer:{'@type':'Answer',text:faq.answer[i]}})) };
      html = html.replace('</head>', `<script id="seo-head-jsonld" type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script></head>`);
    }
    const asset = mediaPrerenderAsset(url);
    manifest[`${pagePath}?lang=${language}`] = asset;
    await writeFile(path.join(root, 'dist', asset), html);
  }
  await writeFile(path.join(root, 'dist/_prerender/manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Prerendered ${paths.length * 2} English/Khmer public pages from shared React views.`);
} finally { await rm(output, { force: true }); }
