'use strict';
/* ============================================================================
   Generates every graphic a store listing needs, from the game's own art.

     store-assets/icon-512.png              listing icon
     store-assets/icon-adaptive-fg-432.png  Android adaptive foreground
     store-assets/icon-adaptive-bg-432.png  Android adaptive background
     store-assets/feature-graphic-1024x500.png
     store-assets/screenshot-1-play.png     1080x1800 phone screenshots
                                            (the game's true 480x800 at 2.25x —
                                            not padded to 1920, so no letterbox)
     store-assets/screenshot-2-jump.png
     store-assets/screenshot-3-streak.png

   Run: npm run assets
   ========================================================================== */

const fs = require('node:fs');
const path = require('node:path');
const { Canvas, gameTextures } = require('./lib/raster.js');

const OUT = path.resolve(__dirname, '..', 'store-assets');
const { env, textures } = gameTextures();
const G = env.g;
const T = (key) => {
  const t = textures.get(key);
  if (!t) throw new Error(`texture "${key}" was not generated — did the art change?`);
  return t;
};

/** Draw a texture centred at (cx, cy), the Phaser default origin. */
function at(canvas, key, cx, cy, scale = 1, alpha = 1) {
  const t = T(key);
  canvas.replay(t.ops, cx - (t.width * scale) / 2, cy - (t.height * scale) / 2, scale, alpha);
}
/** Draw a texture with its top-left at (x, y), for setOrigin(0,0) layers. */
function tl(canvas, key, x, y, scale = 1, alpha = 1) {
  canvas.replay(T(key).ops, x, y, scale, alpha);
}

fs.mkdirSync(OUT, { recursive: true });
const written = [];
const write = (canvas, name, scale = 1) => {
  const { width, height } = canvas.writePng(path.join(OUT, name), scale);
  written.push(`${name}  ${width}x${height}`);
};

// ------------------------------------------------------------------- icon ---
// The critter alone on a meadow-green rounded field: it has to stay legible at
// 48px in a launcher, so no background detail and no text.
function icon(size, { rounded = true, transparentField = false } = {}) {
  const c = new Canvas(size, size, 0xa9ecff);
  if (!transparentField) {
    c.gradientV(0, size, 0x8fe3ff, 0xd8f7e4, 64);
    if (rounded) {
      // corner treatment: paint the field, then knock the corners back to sky
      const r = size * 0.22;
      c.setFill(0x3ec392, 1);
      c.roundedRect(size * 0.06, size * 0.06, size * 0.88, size * 0.88, r);
      c.setFill(0x74dcae, 1);
      c.roundedRect(size * 0.06, size * 0.06, size * 0.88, size * 0.52, r);
    }
  }
  // sun glint, top-left, for a bit of depth
  c.setFill(0xffe873, 0.9);
  c.circle(size * 0.22, size * 0.2, size * 0.075);
  // the critter, filling most of the frame
  at(c, 'player', size * 0.5, size * 0.55, (size * 0.62) / T('player').width);
  return c;
}

write(icon(512), 'icon-512.png');
// Adaptive icons: the foreground art must sit inside the safe circle, so the
// critter is drawn smaller with the field supplied separately.
const fg = new Canvas(432, 432, 0xa9ecff);
fg.gradientV(0, 432, 0xa9ecff, 0xa9ecff, 2);
at(fg, 'player', 216, 216, (432 * 0.42) / T('player').width);
write(fg, 'icon-adaptive-fg-432.png');
const bg = new Canvas(432, 432, 0x74dcae);
bg.gradientV(0, 432, 0x8fe3ff, 0x3ec392, 64);
write(bg, 'icon-adaptive-bg-432.png');

// -------------------------------------------------------- feature graphic ---
// 1024x500 landscape banner: meadow strip with the critter being chased by two
// storks. No text baked in — stores overlay their own, and localised copy is
// better handled in the listing than in a bitmap.
function featureGraphic() {
  const c = new Canvas(1024, 500, 0xa9ecff);
  c.gradientV(0, 500, 0xa9ecff, 0xfff2d2, 96);
  at(c, 'sun', 880, 90, 1.1);
  at(c, 'cloud', 170, 96, 1.5, 0.95);
  at(c, 'cloud', 520, 62, 1.1, 0.8);
  // hills, scaled to the banner
  for (const [key, y, s] of [['hillFar', 250, 1.4], ['hillMid', 320, 1.4], ['hillNear', 396, 1.4]]) {
    for (let x = 0; x < 1024; x += T(key).width * s) tl(c, key, x, y, s);
  }
  c.setFill(0x2e9c6c, 1); c.rect(0, 452, 1024, 48);
  c.setFill(0x6ff0b4, 1); c.rect(0, 452, 1024, 5);
  for (let x = 0; x < 1024; x += T('verge').width * 1.2) tl(c, 'verge', x, 416, 1.2);
  c.setFill(0x14684a, 0.28); c.ellipse(250, 449, 84, 22);
  at(c, 'player', 250, 404, 2.4);
  at(c, 'stork', 620, 385, 2.2);
  at(c, 'stork', 850, 385, 2.2);
  at(c, 'shard', 470, 300, 2.6);
  return c;
}
write(featureGraphic(), 'feature-graphic-1024x500.png');

// -------------------------------------------------------------- gameplay ---
// A faithful frame of the running game, at the real 480x800 layout, then scaled
// to a 1080x1920 phone screenshot.
function gameplayFrame({ playerY = G.GROUND_Y - 17, storks = [300, 436], shard = [372, 604] } = {}) {
  const c = new Canvas(G.W, G.H, 0xa9ecff);
  tl(c, 'sky', 0, 0);
  at(c, 'sun', G.W - 84, 84);
  at(c, 'cloud', 96, 96);
  at(c, 'cloud', 310, 58, 0.8, 0.85);
  at(c, 'cloud', 210, 196, 0.6, 0.55);
  tl(c, 'hillFar', 0, 468);
  tl(c, 'hillMid', 0, 538);
  tl(c, 'hillNear', 0, 608);
  tl(c, 'ground', 0, G.GROUND_Y);
  tl(c, 'verge', 0, G.GROUND_Y - 36);
  // contact shadow, tightening the higher the critter is
  const air = Math.min(1, Math.max(0, (G.GROUND_Y - 17 - playerY) / 130));
  c.setFill(0x14684a, 0.3 - air * 0.2);
  c.ellipse(G.W * 0.24, G.GROUND_Y - 3, 30 * (1 - air * 0.4), 9 * (1 - air * 0.4));
  for (const x of storks) at(c, 'stork', x, G.GROUND_Y - 25);
  if (shard) at(c, 'shard', shard[0], shard[1], 1.6);
  at(c, 'player', G.W * 0.24, playerY);
  return c;
}

write(gameplayFrame(), 'screenshot-1-play.png', 2.25);
write(gameplayFrame({ playerY: G.GROUND_Y - 95, storks: [200, 400], shard: [300, 560] }),
  'screenshot-2-jump.png', 2.25);
write(gameplayFrame({ playerY: G.GROUND_Y - 60, storks: [150, 280, 410], shard: null }),
  'screenshot-3-streak.png', 2.25);

console.log(`Store assets written to store-assets/ (from the game's own textures):`);
for (const w of written) console.log(`  ${w}`);
console.log('\nAll generated from index.html at build time — they cannot drift from the real art.');
