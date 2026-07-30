'use strict';
// Guards the release chain: the version a player sees, the version the store
// orders builds by, and the version in package.json must never drift apart,
// and the shipped app must stay offline and ad-free.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadGame, extractGameSource, INDEX_HTML } = require('../harness');

const ROOT = path.dirname(INDEX_HTML);
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

test('APP_VERSION in the game matches package.json', () => {
  const { g } = loadGame();
  assert.equal(g.APP_VERSION, pkg.version,
    'run `npm run version:sync` — the menu footer would otherwise report the wrong build');
});

test('the version is a plain semver that fits the versionCode formula', () => {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(pkg.version);
  assert.ok(m, `"${pkg.version}" must be MAJOR.MINOR.PATCH with no pre-release suffix`);
  const [, , minor, patch] = m.map(Number);
  assert.ok(minor < 100, 'minor must stay under 100 or versionCode collides');
  assert.ok(patch < 100, 'patch must stay under 100 or versionCode collides');
});

test('versionCode is monotonic across forward version bumps', () => {
  const code = (v) => {
    const [ma, mi, pa] = v.split('.').map(Number);
    return ma * 10000 + mi * 100 + pa;
  };
  const ordered = ['0.9.9', '1.0.0', '1.0.1', '1.0.99', '1.1.0', '1.99.99', '2.0.0'];
  for (let i = 1; i < ordered.length; i++) {
    assert.ok(code(ordered[i]) > code(ordered[i - 1]),
      `${ordered[i]} must outrank ${ordered[i - 1]}`);
  }
  assert.equal(code('1.2.3'), 10203);
});

test('the capacitor app id and name are set and permanent-looking', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'capacitor.config.json'), 'utf8'));
  assert.match(cfg.appId, /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/,
    'the app id must be a valid reverse-domain Android package name');
  assert.equal(cfg.appId, 'com.pulsestreak.game');
  assert.equal(cfg.appName, 'Pulse Streak');
  assert.equal(cfg.webDir, 'www');
  assert.equal(cfg.android.allowMixedContent, false);
});

test('the shipped app makes no network calls', () => {
  const src = extractGameSource();
  for (const banned of [/\bfetch\s*\(/, /XMLHttpRequest/, /WebSocket/, /navigator\.sendBeacon/,
    /import\s*\(/, /https?:\/\//]) {
    assert.equal(banned.test(src), false, `${banned} must not appear: the app ships offline`);
  }
});

test('no advertising or analytics SDK has crept in', () => {
  const src = extractGameSource().toLowerCase();
  for (const banned of ['admob', 'googletagmanager', 'gtag(', 'firebase', 'unityads',
    'applovin', 'facebook.net', 'analytics']) {
    assert.equal(src.includes(banned), false,
      `"${banned}" would change the privacy story and the kids-policy obligations`);
  }
});

test('third-party licence attribution ships with the repo', () => {
  const file = path.join(ROOT, 'THIRD-PARTY-LICENSES.md');
  assert.ok(fs.existsSync(file), 'Phaser is MIT and requires attribution');
  const text = fs.readFileSync(file, 'utf8');
  assert.match(text, /Phaser/);
  assert.match(text, /MIT/);
});

test('signing material can never be committed by accident', () => {
  const ignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  // *.b64 matters as much as *.jks: a base64-encoded keystore is the keystore.
  // It was missed the first time round, which is exactly why this is a test.
  for (const pattern of ['*.jks', '*.keystore', 'keystore.properties', '*.b64']) {
    assert.ok(ignore.includes(pattern), `.gitignore must exclude ${pattern}`);
  }
});

test('no signing material is actually tracked in the repo', () => {
  const { execFileSync } = require('node:child_process');
  const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n').filter(Boolean);
  const leaked = tracked.filter((f) =>
    /\.(jks|keystore|p12|pepk|b64)$/i.test(f) || /(^|\/)keystore\.properties$/.test(f));
  assert.deepEqual(leaked, [], `signing material is committed: ${leaked.join(', ')}`);
});

test('the keystore.properties template is committed but carries no real secret', () => {
  const example = path.join(ROOT, 'android', 'keystore.properties.example');
  if (!fs.existsSync(example)) return;   // android platform not scaffolded yet
  const text = fs.readFileSync(example, 'utf8');
  assert.match(text, /storeFile=/);
  assert.match(text, /CHANGEME/, 'the template must ship with placeholder passwords only');
});

test('every release script referenced by the workflows exists', () => {
  for (const script of ['test', 'check', 'build:www', 'version:sync', 'version:check',
    'assets', 'android:patch']) {
    assert.ok(pkg.scripts[script], `package.json is missing the "${script}" script`);
  }
  for (const file of ['scripts/build-www.js', 'scripts/sync-version.js',
    'scripts/patch-android.js', 'scripts/make-store-assets.js', 'scripts/lib/raster.js']) {
    assert.ok(fs.existsSync(path.join(ROOT, file)), `missing ${file}`);
  }
});

test('the store assets a listing needs are all present', () => {
  const dir = path.join(ROOT, 'store-assets');
  for (const f of ['icon-512.png', 'icon-adaptive-fg-432.png', 'icon-adaptive-bg-432.png',
    'feature-graphic-1024x500.png', 'screenshot-1-play.png']) {
    const p = path.join(dir, f);
    assert.ok(fs.existsSync(p), `missing store asset ${f}`);
    assert.ok(fs.statSync(p).size > 1000, `${f} looks empty`);
  }
});
