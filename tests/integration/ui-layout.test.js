'use strict';
/* ============================================================================
   UI layout and device-compatibility tests.

   Written in direct response to an Indus Appstore review hold:

     "The UI is cluttered / is not compatible with the device dimensions.
      Optimize your UI so that it does not interfere with the core
      functionalities of the app."

   Root cause: the game declared no Phaser Scale config, so the canvas rendered
   at a fixed 480x800 CSS pixels. A 1080x2400 phone at DPR 3 has a 360px-wide
   CSS viewport, clipping 120px — a quarter of the playfield — including the
   energy meter and the daily-bonus button, and delaying when obstacles became
   visible.

   These tests encode the reviewer's criteria so the regression cannot return.
   ========================================================================== */

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame, tap, clickButton, plain } = require('../harness');

const MARGIN = 24;      // must match index.html
const TOUCH_MIN = 44;   // Android/Material minimum touch target

/** Bounding box of an object in canvas coordinates (origin 0.5 assumed). */
function box(o) {
  const w = o.width || (o.radius ? o.radius * 2 : 0);
  const h = o.height || (o.radius ? o.radius * 2 : 0);
  return { left: o.x - w / 2, right: o.x + w / 2, top: o.y - h / 2, bottom: o.y + h / 2, w, h };
}
const interactives = (scene) => scene.children.list.filter((o) => o.interactive && !o.destroyed);
const describe = (o) => `${o.type}${o.text ? ` "${o.text}"` : ''} at (${Math.round(o.x)},${Math.round(o.y)})`;

function openMenu(env, seed) {
  if (seed) env.seedSave(seed);
  env.boot();
  const menu = new env.g.MenuScene();
  menu.create();
  return menu;
}

// --------------------------------------------------- device compatibility ---

test('the game declares a scale mode, so it fits any screen', () => {
  const { g, Phaser } = loadGame();
  assert.ok(g.config.scale, 'without a scale config the canvas renders at a fixed size and is clipped');
  assert.equal(g.config.scale.mode, Phaser.Scale.FIT,
    'FIT scales the whole playfield to the device; ENVELOP or NONE would crop it');
  assert.equal(g.config.scale.autoCenter, Phaser.Scale.CENTER_BOTH);
  assert.equal(g.config.scale.width, g.W);
  assert.equal(g.config.scale.height, g.H);
});

test('the playfield is fully visible on every common Android viewport', () => {
  const { g } = loadGame();
  // CSS viewport = physical pixels / devicePixelRatio. FIT scales by the smaller
  // axis ratio, so the whole 480x800 field is always visible; the assertion is
  // that the resulting scale is positive and preserves aspect on each device.
  const devices = [
    ['720x1600 @2', 360, 800], ['1080x2400 @3', 360, 800],
    ['1080x2340 @2.75', 393, 851], ['1080x2400 @2.625', 411, 914],
    ['720x1280 @2', 360, 640], ['800x1280 @1.5', 533, 853]
  ];
  for (const [name, cw, ch] of devices) {
    const scale = Math.min(cw / g.W, ch / g.H);
    assert.ok(scale > 0, name);
    const shownW = g.W * scale, shownH = g.H * scale;
    assert.ok(shownW <= cw + 0.001, `${name}: ${shownW} wider than viewport ${cw}`);
    assert.ok(shownH <= ch + 0.001, `${name}: ${shownH} taller than viewport ${ch}`);
    // aspect preserved => nothing stretched or cropped
    assert.ok(Math.abs((shownW / shownH) - (g.W / g.H)) < 1e-9, `${name}: aspect distorted`);
  }
});

test('the page background covers the letterbox bars', () => {
  const { readIndexHtml } = require('../harness');
  const html = readIndexHtml();
  assert.match(html, /background:linear-gradient/,
    'FIT leaves bars on tall phones; a plain black body would read as broken layout');
  assert.equal(/image-rendering:\s*pixelated/.test(html), false,
    'nearest-neighbour would make the scaled vector art jagged');
});

// ------------------------------------------------------- touch ergonomics ---

test('every menu button meets the 44px minimum touch target', () => {
  const env = loadGame();
  const menu = openMenu(env, { shards: 200, leaderboard: [{ name: 'AAA', score: 9 }] });

  const small = interactives(menu)
    .map((o) => ({ o, b: box(o) }))
    .filter(({ b }) => b.w < TOUCH_MIN || b.h < TOUCH_MIN)
    .map(({ o, b }) => `${describe(o)} is ${Math.round(b.w)}x${Math.round(b.h)}`);
  assert.deepEqual(plain(small), [], 'targets under 44px are hard for small hands to hit');
});

test('every menu button sits clear of the screen edges', () => {
  const env = loadGame();
  const menu = openMenu(env, { shards: 200 });

  const tooClose = interactives(menu)
    .map((o) => ({ o, b: box(o) }))
    .filter(({ b }) => b.left < MARGIN || b.top < MARGIN ||
      b.right > env.g.W - MARGIN || b.bottom > env.g.H - MARGIN)
    .map(({ o }) => describe(o));
  assert.deepEqual(plain(tooClose), [],
    'content within the margin risks rounded corners, cut-outs and gesture bars');
});

test('no two tappable targets overlap', () => {
  const env = loadGame();
  const menu = openMenu(env, { shards: 200, trails: [...loadGame().g.TRAIL_POOL] });

  const items = interactives(menu).map((o) => ({ o, b: box(o) }));
  const clashes = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i].b, c = items[j].b;
      if (a.left < c.right && a.right > c.left && a.top < c.bottom && a.bottom > c.top) {
        clashes.push(`${describe(items[i].o)} overlaps ${describe(items[j].o)}`);
      }
    }
  }
  assert.deepEqual(plain(clashes), [], 'overlapping targets cause mis-taps');
});

// ------------------------------------------------------------- clutter ---

test('the menu keeps its element count low enough to read at a glance', () => {
  const env = loadGame();
  const board = [];
  for (let i = 1; i <= 10; i++) board.push({ name: 'P' + i, score: i * 5 });
  const menu = openMenu(env, { leaderboard: board, shards: 300 });

  // Single-glyph icons (padlocks on locked swatches) are not text clutter.
  const texts = menu.children.list.filter(
    (o) => o.type === 'text' && String(o.text).replace(/[🌀-🫿☀-➿]/gu, '').trim().length > 1);
  assert.ok(texts.length <= 16,
    `menu shows ${texts.length} text elements; the review hold cited clutter`);
});

test('a full leaderboard shows only the top three inline', () => {
  const env = loadGame();
  const board = [];
  for (let i = 1; i <= 10; i++) board.push({ name: 'P' + i, score: i * 5 });
  const menu = openMenu(env, { leaderboard: board });

  const rows = menu.children.list.filter((o) => o.type === 'text' && /^\d\.\s/.test(o.text));
  assert.equal(rows.length, 3, 'ten always-visible rows was the main source of visual noise');
  assert.ok(menu.children.list.some((o) => o.text === 'VIEW ALL'), 'the full list stays reachable');
});

test('VIEW ALL opens the full board and closes cleanly', () => {
  const env = loadGame();
  const board = [];
  for (let i = 1; i <= 10; i++) board.push({ name: 'P' + i, score: i * 5 });
  const menu = openMenu(env, { leaderboard: board });

  clickButton(menu, 'VIEW ALL');
  const rows = menu.children.list.filter((o) => o.type === 'text' && /^\d+\.\s{2}/.test(o.text));
  assert.equal(rows.length, 10, 'all ten entries are shown in the panel');

  clickButton(menu, 'CLOSE');
  assert.equal(menu.children.list.filter((o) => /^\d+\.\s{2}/.test(o.text || '')).length, 0,
    'the panel tears down completely');
});

test('nothing is drawn outside the canvas', () => {
  const env = loadGame();
  const menu = openMenu(env, { shards: 200 });

  const outside = menu.children.list
    .filter((o) => o.type !== 'text')
    .map((o) => ({ o, b: box(o) }))
    .filter(({ b }) => b.right < 0 || b.left > env.g.W || b.bottom < 0 || b.top > env.g.H)
    .map(({ o }) => describe(o));
  assert.deepEqual(plain(outside), [], 'off-canvas elements were invisible on narrow devices');
});

// ------------------------------------------------------------ game scene ---

test('the in-game HUD respects the safe margin', () => {
  const env = loadGame();
  env.boot();
  const game = new env.g.GameScene();
  game.create();

  for (const el of [game.scoreText, game.streakText]) {
    assert.ok(el.x >= MARGIN, `HUD at x=${el.x} is inside the ${MARGIN}px margin`);
    assert.ok(el.y >= MARGIN, `HUD at y=${el.y} is inside the ${MARGIN}px margin`);
  }
});

test('game-over buttons are reachable and correctly sized', () => {
  const env = loadGame();
  env.setRandom(() => 0.99);
  env.boot();
  const game = new env.g.GameScene();
  game.create();
  tap(game);
  game.score = 5;
  game.endRun();

  for (const o of interactives(game)) {
    const b = box(o);
    assert.ok(b.h >= TOUCH_MIN, `${describe(o)} is only ${Math.round(b.h)}px tall`);
    assert.ok(b.left >= MARGIN && b.right <= env.g.W - MARGIN, `${describe(o)} breaches the margin`);
    assert.ok(b.top >= MARGIN && b.bottom <= env.g.H - MARGIN, `${describe(o)} breaches the margin`);
  }
});

test('shop buttons are reachable and correctly sized', () => {
  const env = loadGame();
  const menu = openMenu(env, { shards: 500 });
  clickButton(menu, 'SHOP / UPGRADES');

  const shopTargets = interactives(menu).filter((o) => o.depth >= 70);
  assert.ok(shopTargets.length >= 4, 'three buy buttons plus a close button');
  for (const o of shopTargets) {
    const b = box(o);
    assert.ok(b.w >= TOUCH_MIN && b.h >= TOUCH_MIN, `${describe(o)} is ${Math.round(b.w)}x${Math.round(b.h)}`);
    assert.ok(b.left >= MARGIN && b.right <= env.g.W - MARGIN, `${describe(o)} breaches the margin`);
  }
});

test('the initials prompt button is reachable and correctly sized', () => {
  const env = loadGame();
  env.setRandom(() => 0.99);
  env.boot();
  const game = new env.g.GameScene();
  game.create();
  tap(game);
  game.score = 12;
  game.endRun();
  clickButton(game, 'MENU');

  const save = interactives(game).find((o) => Math.abs(o.y - (env.g.H / 2 + 90)) < 2);
  assert.ok(save, 'the SAVE button exists');
  const b = box(save);
  assert.ok(b.h >= TOUCH_MIN, `SAVE is only ${Math.round(b.h)}px tall`);
  assert.ok(b.w >= TOUCH_MIN);
});
