'use strict';
/* ============================================================================
   Publishes the playable game to docs/play/, which GitHub Pages serves at
   https://<user>.github.io/pulse-streak/play/

   Instant-play in a browser is the highest-reach, zero-cost distribution
   channel available to this game: no store review, no install friction, no
   platform gatekeeper, and a link that works on any device in the world.

   Same two files the Android app wraps, so the web build can never drift from
   the shipped game. Adds a PWA manifest so it can be installed to a home screen
   without an app store at all.

   Run: npm run build:web
   ========================================================================== */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PLAY = path.join(ROOT, 'docs', 'play');
const FILES = ['index.html', 'phaser.min.js'];

fs.rmSync(PLAY, { recursive: true, force: true });
fs.mkdirSync(PLAY, { recursive: true });

for (const f of FILES) {
  const src = path.join(ROOT, f);
  if (!fs.existsSync(src)) throw new Error(`missing ${f}`);
  fs.copyFileSync(src, path.join(PLAY, f));
}

// Social preview + PWA metadata, injected rather than kept in index.html so the
// single-file "double-click and it runs" property of the source is preserved.
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const BASE = 'https://venkyi21.github.io/pulse-streak';
const head = `
<meta name="description" content="One tap to hop the storks, grab shards, and keep your streak alive. Free, no ads, works offline.">
<meta name="theme-color" content="#a9ecff">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="../icon.png">
<meta property="og:type" content="website">
<meta property="og:title" content="Pulse Streak — one tap. one streak. one more run.">
<meta property="og:description" content="A tiny one-tap runner. No ads, no tracking, plays instantly in your browser.">
<meta property="og:url" content="${BASE}/play/">
<meta property="og:image" content="${BASE}/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${BASE}/og.png">
`;

const page = path.join(PLAY, 'index.html');
let html = fs.readFileSync(page, 'utf8');
if (!html.includes('og:title')) {
  html = html.replace('</head>', `${head}</head>`);
  fs.writeFileSync(page, html);
}

fs.writeFileSync(path.join(PLAY, 'manifest.webmanifest'), JSON.stringify({
  name: 'Pulse Streak',
  short_name: 'Pulse Streak',
  description: 'One tap. One streak. One more run.',
  start_url: './',
  scope: './',
  display: 'fullscreen',
  orientation: 'portrait',
  background_color: '#a9ecff',
  theme_color: '#a9ecff',
  version: pkg.version,
  icons: [
    { src: '../icon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
  ]
}, null, 2) + '\n');

// Social preview image: the feature graphic is already 1024x500, close enough
// to the 1.91:1 that link unfurlers want.
fs.copyFileSync(
  path.join(ROOT, 'store-assets', 'feature-graphic-1024x500.png'),
  path.join(ROOT, 'docs', 'og.png')
);

const bytes = FILES.reduce((n, f) => n + fs.statSync(path.join(PLAY, f)).size, 0);
console.log(`docs/play/ built — ${(bytes / 1024).toFixed(0)} KB, playable at ${BASE}/play/`);
console.log('  + manifest.webmanifest (installable to a home screen, no store needed)');
console.log('  + docs/og.png (link preview image)');
