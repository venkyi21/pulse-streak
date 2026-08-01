'use strict';
/* ============================================================================
   A tiny software rasterizer for the game's own procedural art.

   The game draws everything with Phaser Graphics calls at runtime, which means
   there are no image files to hand a store listing. This replays the exact
   recorded draw ops into a pixel buffer and writes a PNG, so the launcher icon,
   feature graphic and screenshots are generated from the shipped art itself and
   can never drift from what players actually see.

   Supports the primitives the game uses: fillStyle / fillCircle / fillEllipse /
   fillRect / fillRoundedRect / fillTriangle. Coverage is estimated by
   supersampling, which is what gives the edges their anti-aliasing.
   ========================================================================== */

const zlib = require('node:zlib');
const fs = require('node:fs');

let DEFAULT_SS = 4;   // supersamples per axis

class Canvas {
  /**
   * @param background colour to prefill with, or `null` for a transparent
   *   canvas (needed for adaptive launcher-icon foregrounds, which must let the
   *   background layer show through).
   */
  constructor(width, height, background = 0xffffff, samples = DEFAULT_SS) {
    this.width = width;
    this.height = height;
    this.ss = samples;
    this.buf = new Float32Array(width * height * 3);
    this.alpha = new Float32Array(width * height);
    this.hasAlpha = background === null;
    this.fill = { r: 255, g: 255, b: 255, a: 1 };
    if (!this.hasAlpha) {
      const [r, g, b] = Canvas.rgb(background);
      for (let i = 0; i < width * height; i++) {
        this.buf[i * 3] = r; this.buf[i * 3 + 1] = g; this.buf[i * 3 + 2] = b;
        this.alpha[i] = 1;
      }
    }
  }

  static rgb(color) { return [(color >> 16) & 255, (color >> 8) & 255, color & 255]; }

  setFill(color, alpha = 1) {
    const [r, g, b] = Canvas.rgb(color);
    this.fill = { r, g, b, a: alpha };
  }

  /** Blend a shape described by an inside() predicate over its bounding box. */
  paint(inside, x0, y0, x1, y1) {
    const px0 = Math.max(0, Math.floor(x0)), px1 = Math.min(this.width - 1, Math.ceil(x1));
    const py0 = Math.max(0, Math.floor(y0)), py1 = Math.min(this.height - 1, Math.ceil(y1));
    for (let py = py0; py <= py1; py++) {
      for (let px = px0; px <= px1; px++) {
        let hits = 0;
        for (let sy = 0; sy < this.ss; sy++) {
          for (let sx = 0; sx < this.ss; sx++) {
            if (inside(px + (sx + 0.5) / this.ss, py + (sy + 0.5) / this.ss)) hits++;
          }
        }
        if (!hits) continue;
        const sa = this.fill.a * (hits / (this.ss * this.ss));
        const p = py * this.width + px;
        const i = p * 3;
        // Standard source-over compositing on non-premultiplied colour.
        const da = this.alpha[p];
        const oa = sa + da * (1 - sa);
        if (oa <= 0) { this.alpha[p] = 0; continue; }
        this.buf[i] = (this.fill.r * sa + this.buf[i] * da * (1 - sa)) / oa;
        this.buf[i + 1] = (this.fill.g * sa + this.buf[i + 1] * da * (1 - sa)) / oa;
        this.buf[i + 2] = (this.fill.b * sa + this.buf[i + 2] * da * (1 - sa)) / oa;
        this.alpha[p] = oa;
      }
    }
  }

  circle(cx, cy, r) {
    this.paint((x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r, cx - r, cy - r, cx + r, cy + r);
  }

  ellipse(cx, cy, w, h) {
    const rx = w / 2, ry = h / 2;
    this.paint((x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1,
      cx - rx, cy - ry, cx + rx, cy + ry);
  }

  rect(rx, ry, rw, rh) {
    this.paint((x, y) => x >= rx && x <= rx + rw && y >= ry && y <= ry + rh,
      rx, ry, rx + rw, ry + rh);
  }

  roundedRect(rx, ry, rw, rh, radius) {
    const r = Math.min(radius, rw / 2, rh / 2);
    this.paint((x, y) => {
      if (x < rx || x > rx + rw || y < ry || y > ry + rh) return false;
      const dx = Math.max(rx + r - x, 0, x - (rx + rw - r));
      const dy = Math.max(ry + r - y, 0, y - (ry + rh - r));
      return dx * dx + dy * dy <= r * r;
    }, rx, ry, rx + rw, ry + rh);
  }

  triangle(ax, ay, bx, by, cx, cy) {
    const sg = (px, py, qx, qy, rx, ry) => (px - rx) * (qy - ry) - (qx - rx) * (py - ry);
    this.paint((x, y) => {
      const d1 = sg(x, y, ax, ay, bx, by);
      const d2 = sg(x, y, bx, by, cx, cy);
      const d3 = sg(x, y, cx, cy, ax, ay);
      return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
    }, Math.min(ax, bx, cx), Math.min(ay, by, cy), Math.max(ax, bx, cx), Math.max(ay, by, cy));
  }

  /** Vertical gradient, matching how the in-game sky is painted. */
  gradientV(y0, y1, c0, c1, steps = 96) {
    const [r0, g0, b0] = Canvas.rgb(c0), [r1, g1, b1] = Canvas.rgb(c1);
    const h = (y1 - y0) / steps;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      this.setFill(
        (Math.round(r0 + (r1 - r0) * t) << 16) |
        (Math.round(g0 + (g1 - g0) * t) << 8) |
        Math.round(b0 + (b1 - b0) * t), 1
      );
      this.rect(0, y0 + i * h, this.width, h + 1);
    }
  }

  /** Replay a recorded Phaser Graphics op list, translated and scaled. */
  replay(ops, dx = 0, dy = 0, s = 1, alphaMul = 1) {
    for (const [op, ...a] of ops) {
      switch (op) {
        case 'fillStyle':
          this.setFill(a[0], (a[1] === undefined ? 1 : a[1]) * alphaMul);
          break;
        case 'fillCircle': this.circle(a[0] * s + dx, a[1] * s + dy, a[2] * s); break;
        case 'fillEllipse': this.ellipse(a[0] * s + dx, a[1] * s + dy, a[2] * s, a[3] * s); break;
        case 'fillRect': this.rect(a[0] * s + dx, a[1] * s + dy, a[2] * s, a[3] * s); break;
        case 'fillRoundedRect':
          this.roundedRect(a[0] * s + dx, a[1] * s + dy, a[2] * s, a[3] * s, (a[4] || 0) * s);
          break;
        case 'fillTriangle':
          this.triangle(a[0] * s + dx, a[1] * s + dy, a[2] * s + dx, a[3] * s + dy,
            a[4] * s + dx, a[5] * s + dy);
          break;
        default: break;   // strokes/paths are unused by the game's textures
      }
    }
  }

  /** Write a PNG (RGB, or RGBA when the canvas was created transparent). */
  writePng(file, scale = 1) {
    const OW = Math.round(this.width * scale), OH = Math.round(this.height * scale);
    const ch = this.hasAlpha ? 4 : 3;
    const raw = Buffer.alloc(OH * (OW * ch + 1));
    for (let y = 0; y < OH; y++) {
      const rs = y * (OW * ch + 1);
      raw[rs] = 0;
      for (let x = 0; x < OW; x++) {
        const sy = Math.min(this.height - 1, Math.floor(y / scale));
        const sx = Math.min(this.width - 1, Math.floor(x / scale));
        const p = sy * this.width + sx;
        const i = p * 3;
        const o = rs + 1 + x * ch;
        raw[o] = Math.round(this.buf[i]);
        raw[o + 1] = Math.round(this.buf[i + 1]);
        raw[o + 2] = Math.round(this.buf[i + 2]);
        if (ch === 4) raw[o + 3] = Math.round(this.alpha[p] * 255);
      }
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(OW, 0); ihdr.writeUInt32BE(OH, 4);
    ihdr[8] = 8; ihdr[9] = this.hasAlpha ? 6 : 2;
    fs.writeFileSync(file, Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0))
    ]));
    return { width: OW, height: OH };
  }
}

let TABLE = null;
function crc32(buf) {
  if (!TABLE) {
    TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      TABLE[n] = c;
    }
  }
  let c = -1;
  for (const b of buf) c = TABLE[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/**
 * Boot the game in the test harness and return each generated texture's
 * recorded draw ops, so assets are built from the real art.
 */
function gameTextures() {
  const H = require('../../tests/harness.js');
  const env = H.loadGame();
  const boot = env.boot();
  const ops = boot.__graphics[0].__ops;
  const byKey = new Map();
  let start = 0;
  for (let i = 0; i < ops.length; i++) {
    if (ops[i][0] !== 'generateTexture') continue;
    byKey.set(ops[i][1], {
      key: ops[i][1],
      width: ops[i][2],
      height: ops[i][3],
      ops: ops.slice(start, i).filter((o) => o[0] !== 'clear')
    });
    start = i + 1;
  }
  return { env, textures: byKey };
}

module.exports = { Canvas, gameTextures };
