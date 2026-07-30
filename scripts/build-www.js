'use strict';
// Assembles www/ — the exact payload Capacitor wraps into the Android app.
// The game is deliberately two files and no build step, so this is a copy with
// a verification pass rather than a bundler.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const WWW = path.join(ROOT, 'www');
const FILES = ['index.html', 'phaser.min.js'];

function main() {
  fs.rmSync(WWW, { recursive: true, force: true });
  fs.mkdirSync(WWW, { recursive: true });

  for (const f of FILES) {
    const src = path.join(ROOT, f);
    if (!fs.existsSync(src)) throw new Error(`missing required file: ${f}`);
    fs.copyFileSync(src, path.join(WWW, f));
  }

  // The app must be fully offline: an Android WebView with no network permission
  // silently fails any remote request, so a stray URL would break the release
  // build while working fine in a desktop browser.
  const html = fs.readFileSync(path.join(WWW, 'index.html'), 'utf8');
  const remote = (html.match(/(?:src|href)\s*=\s*["'](https?:)?\/\//gi) || []);
  if (remote.length) {
    throw new Error(`www/index.html references remote resources: ${remote.join(', ')}`);
  }
  for (const tag of html.match(/<script[^>]*src=["']([^"']+)["']/gi) || []) {
    const ref = /src=["']([^"']+)["']/i.exec(tag)[1];
    if (!fs.existsSync(path.join(WWW, ref))) {
      throw new Error(`www/index.html loads "${ref}", which is not in www/`);
    }
  }

  const bytes = FILES.reduce((n, f) => n + fs.statSync(path.join(WWW, f)).size, 0);
  console.log(`www/ built: ${FILES.join(', ')} (${(bytes / 1024).toFixed(0)} KB, fully offline)`);
}

main();
