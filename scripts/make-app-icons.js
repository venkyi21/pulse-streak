'use strict';
/* ============================================================================
   Generates the Android launcher icons from the game's own critter, replacing
   the stock Capacitor logo that `cap add android` ships.

   Writes, into every mipmap-<density> folder:
     ic_launcher.png             square icon  (48/72/96/144/192)
     ic_launcher_round.png       round icon   (same sizes)
     ic_launcher_foreground.png  adaptive foreground, TRANSPARENT
                                 (108/162/216/324/432)
   and sets values/ic_launcher_background.xml to the meadow green.

   Adaptive icons are 108dp with only the central 72dp guaranteed visible, so
   the foreground critter is drawn small enough to survive any launcher mask.

   Run: npm run icons
   ========================================================================== */

const fs = require('node:fs');
const path = require('node:path');
const { Canvas, gameTextures } = require('./lib/raster.js');

const RES = path.resolve(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const { textures } = gameTextures();
const PLAYER = textures.get('player');
if (!PLAYER) throw new Error('player texture missing — did the art change?');

// density -> [legacy icon px, adaptive foreground px]
const DENSITIES = {
  mdpi: [48, 108],
  hdpi: [72, 162],
  xhdpi: [96, 216],
  xxhdpi: [144, 324],
  xxxhdpi: [192, 432]
};

const FIELD_TOP = 0x8fe3ff;      // sky blue
const FIELD_BOTTOM = 0x3ec392;   // meadow green
const BACKGROUND = '#74DCAE';    // adaptive background layer

/** Draw the critter centred, scaled to a fraction of the canvas width. */
function critter(c, size, frac) {
  const s = (size * frac) / PLAYER.width;
  c.replay(PLAYER.ops, (size - PLAYER.width * s) / 2, (size - PLAYER.height * s) / 2, s);
}

/** Opaque square icon: meadow field, sun glint, critter. */
function squareIcon(size) {
  const c = new Canvas(size, size, FIELD_TOP);
  c.gradientV(0, size, FIELD_TOP, FIELD_BOTTOM, 48);
  c.setFill(0xffe873, 0.9);
  c.circle(size * 0.22, size * 0.2, size * 0.075);
  critter(c, size, 0.62);
  return c;
}

/** Round icon: circular field so it looks right on launchers that use it. */
function roundIcon(size) {
  const c = new Canvas(size, size, null);            // transparent corners
  const steps = 40;
  for (let i = 0; i < steps; i++) {                  // banded radial-ish fill
    const t = i / (steps - 1);
    const col = mix(FIELD_TOP, FIELD_BOTTOM, t);
    c.setFill(col, 1);
    const y0 = (size * i) / steps;
    // clip the band to the circle by painting a circle then bands over it
    if (i === 0) { c.setFill(FIELD_TOP, 1); c.circle(size / 2, size / 2, size / 2); }
    c.setFill(col, 1);
    c.paint((x, y) => {
      const dx = x - size / 2, dy = y - size / 2;
      return dx * dx + dy * dy <= (size / 2) * (size / 2) &&
        y >= y0 && y < y0 + size / steps + 1;
    }, 0, y0, size, y0 + size / steps + 1);
  }
  c.setFill(0xffe873, 0.9);
  c.circle(size * 0.24, size * 0.22, size * 0.07);
  critter(c, size, 0.6);
  return c;
}

/** Adaptive foreground: transparent, critter inside the 72/108 safe zone. */
function foregroundIcon(size) {
  const c = new Canvas(size, size, null);
  critter(c, size, 0.46);
  return c;
}

function mix(a, b, t) {
  const ch = (s) => [(s >> 16) & 255, (s >> 8) & 255, s & 255];
  const [r0, g0, b0] = ch(a), [r1, g1, b1] = ch(b);
  return (Math.round(r0 + (r1 - r0) * t) << 16) |
    (Math.round(g0 + (g1 - g0) * t) << 8) |
    Math.round(b0 + (b1 - b0) * t);
}

let written = 0;
for (const [density, [legacy, adaptive]] of Object.entries(DENSITIES)) {
  const dir = path.join(RES, `mipmap-${density}`);
  if (!fs.existsSync(dir)) {
    console.error(`skipping ${density}: ${dir} does not exist`);
    continue;
  }
  squareIcon(legacy).writePng(path.join(dir, 'ic_launcher.png'));
  roundIcon(legacy).writePng(path.join(dir, 'ic_launcher_round.png'));
  foregroundIcon(adaptive).writePng(path.join(dir, 'ic_launcher_foreground.png'));
  written += 3;
  console.log(`  mipmap-${density.padEnd(7)} ${legacy}px icons + ${adaptive}px foreground`);
}

const bgXml = path.join(RES, 'values', 'ic_launcher_background.xml');
if (fs.existsSync(bgXml)) {
  fs.writeFileSync(bgXml,
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n' +
    `    <color name="ic_launcher_background">${BACKGROUND}</color>\n</resources>\n`);
  console.log(`  values/ic_launcher_background.xml -> ${BACKGROUND}`);
}

console.log(`\n${written} launcher icons generated from the game's own artwork.`);
