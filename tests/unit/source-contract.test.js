'use strict';
// Unit tests on the shipped artifact itself. The game's headline constraint is
// "double-click index.html and it runs" — one local Phaser file, no CDN, no
// image/audio assets, no server. These tests guard that contract.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  readIndexHtml, readScriptTags, extractGameSource, loadGame, INDEX_HTML, plain
} = require('../harness');

const ROOT = path.dirname(INDEX_HTML);

test('index.html has exactly one inline script plus the local phaser tag', () => {
  const tags = readScriptTags();
  const external = tags.filter((t) => /\bsrc\s*=/i.test(t.attrs));
  const inline = tags.filter((t) => !/\bsrc\s*=/i.test(t.attrs));

  assert.equal(inline.length, 1, 'all game code lives in a single inline script');
  assert.equal(external.length, 1);
  assert.match(external[0].attrs, /src="phaser\.min\.js"/,
    'Phaser is vendored next to index.html, not pulled from a CDN');
});

test('nothing is loaded over the network (works from file://)', () => {
  const html = readIndexHtml();
  const urls = html.match(/https?:\/\/[^\s"')]+/g) || [];
  const remote = urls.filter((u) => !/^https?:\/\/(www\.)?w3\.org/.test(u));
  assert.deepEqual(remote, [], `unexpected remote reference(s): ${remote.join(', ')}`);
  assert.equal(/\bfetch\s*\(|XMLHttpRequest|importScripts/.test(html), false);
});

test('the vendored phaser build is present next to index.html', () => {
  const phaser = path.join(ROOT, 'phaser.min.js');
  assert.equal(fs.existsSync(phaser), true);
  assert.ok(fs.statSync(phaser).size > 100000, 'looks like a real Phaser bundle');
});

test('no external image or audio assets are referenced', () => {
  const src = extractGameSource();
  assert.equal(/this\.load\.(image|audio|spritesheet|atlas)/.test(src), false,
    'all art/audio is procedural; a loader call would break the no-assets promise');
  assert.match(src, /generateTexture/, 'textures are generated at runtime');
});

test('the Phaser game config wires up everything the scenes rely on', () => {
  const { g } = loadGame();
  const c = g.config;

  // Dimensions now live in the scale block so the canvas is fitted to the
  // device rather than rendered at a fixed size and clipped.
  assert.equal(c.scale.width, g.W);
  assert.equal(c.scale.height, g.H);
  assert.equal(c.parent, 'game-wrap');
  assert.equal(c.physics.default, 'arcade');
  assert.equal(c.physics.arcade.gravity.y, 0,
    'world gravity is off; the player body sets its own');
  assert.equal(c.physics.arcade.debug, false, 'debug draw must be off in the shipped build');
  assert.equal(c.dom.createContainer, true,
    'the leaderboard initials <input> needs the DOM container');
  assert.deepEqual(plain(c.scene.map((s) => s.name)), ['BootScene', 'MenuScene', 'GameScene'],
    'Boot must run first so textures exist before Menu/Game');
});

test('the playfield geometry leaves the ground strip fully on screen', () => {
  const { g } = loadGame();
  assert.equal(g.W, 480);
  assert.equal(g.H, 800);
  assert.equal(g.GROUND_Y, g.H - 90, 'the ground texture is 90px tall');
});

test('the trail palette is unique, hex-formatted, and starts with the default', () => {
  const { g } = loadGame();
  assert.equal(new Set(g.TRAIL_POOL).size, g.TRAIL_POOL.length, 'no duplicate colours');
  for (const hex of g.TRAIL_POOL) {
    assert.match(hex, /^0x[0-9a-f]{6}$/, `${hex} must be parseable by parseInt(hex, 16)`);
    assert.equal(Number.isNaN(parseInt(hex, 16)), false);
  }
  assert.equal(g.TRAIL_POOL[0], g.loadSave().equipped,
    'the equipped default must be an owned pool colour');
  assert.ok(g.loadSave().trails.every((t) => g.TRAIL_POOL.includes(t)));
});

test('a fatal error is surfaced as visible text rather than a blank canvas', () => {
  const env = loadGame();
  env.g.showFatalError('boom');
  assert.equal(env.appended.length, 1);
  assert.equal(env.appended[0].textContent, 'boom');
  assert.match(env.appended[0].style.cssText, /position:fixed/);
});

test('window error events are reported through the same overlay', () => {
  const env = loadGame();
  env.fireWindowEvent('error', { message: 'kaboom', filename: 'index.html', lineno: 12 });
  assert.equal(env.appended.length, 1);
  assert.match(env.appended[0].textContent, /Script error: kaboom/);
  assert.match(env.appended[0].textContent, /index\.html:12/);
});

test('beep() never throws when Web Audio is unavailable', () => {
  const { g } = loadGame(); // sandbox has no AudioContext
  assert.doesNotThrow(() => g.beep(440));
  assert.doesNotThrow(() => g.beep(440, 0.1, 'square', 0.2));
});
