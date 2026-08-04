'use strict';
/* =========================================================================
   Test harness for PULSE STREAK.

   The game ships as one file (index.html) with an inline <script> and no
   module system, so there is nothing to `require`. Instead of duplicating the
   logic in a test copy (which rots), this harness:

     1. reads index.html and extracts the inline <script> source verbatim,
     2. evaluates it in a fresh `vm` context per test, against a fake Phaser,
        fake localStorage and fake DOM,
     3. exposes the top-level functions/classes so tests can call them.

   The fakes are deliberately faithful where fidelity changes behaviour:
     * Group.children.iterate() caches the length up front and walks the live
       array, and destroying a member splices it out of the group — exactly
       like Phaser's Structs.Set, so destroy-while-iterating bugs are visible
       to tests instead of being smoothed over.
     * Textures remember the width/height they were generated with, so bodies
       get real sizes and AABB overlap tests mean something.
     * runFrame() applies gravity, integrates velocities, resolves the
       ground collider and fires overlap callbacks, so integration tests can
       actually scroll an obstacle into the player.
   ========================================================================= */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const INDEX_HTML = path.resolve(__dirname, '..', 'index.html');

// Top-level bindings the tests need. `const`/`class` at the top level of a
// script are lexical, not properties of globalThis, so an epilogue copies
// them onto a known global.
const EXPORTS = [
  'APP_VERSION', 'W', 'H', 'GROUND_Y', 'SAVE_KEY',
  'ENERGY_MAX', 'ENERGY_REGEN_MS',
  'safeGetItem', 'safeSetItem', 'loadSave', 'save',
  'TRAIL_POOL', 'regenEnergy', 'energyEtaSeconds',
  'checkLoginStreak', 'loginStreakReward', 'beep',
  'BootScene', 'MenuScene', 'GameScene', 'showFatalError', 'config'
];

// ---------------------------------------------------------------- source ---

function readIndexHtml() {
  return fs.readFileSync(INDEX_HTML, 'utf8');
}

/** All <script> blocks in index.html, with their raw attribute text. */
function readScriptTags(html = readIndexHtml()) {
  const tags = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) tags.push({ attrs: m[1], body: m[2] });
  return tags;
}

/** The game's inline script source, exactly as shipped. */
function extractGameSource(html = readIndexHtml()) {
  const inline = readScriptTags(html).filter((t) => !/\bsrc\s*=/i.test(t.attrs));
  if (inline.length !== 1) {
    throw new Error(`expected exactly one inline <script>, found ${inline.length}`);
  }
  return inline[0].body;
}

// ----------------------------------------------------------------- clock ---

/** Stand-in for Phaser's Clock: deterministic, manually advanced. */
class FakeClock {
  constructor() {
    this.now = 0;
    this.events = [];
  }

  addEvent(cfg) {
    const clock = this;
    let paused = !!cfg.paused;
    const ev = {
      delay: cfg.delay || 0,
      loop: !!cfg.loop,
      repeat: cfg.repeat || 0,
      callback: cfg.callback,
      args: cfg.args || [],
      callbackScope: cfg.callbackScope,
      fired: 0,
      removed: false,
      nextAt: clock.now + (cfg.delay || 0),
      remove() { ev.removed = true; }
    };
    // Phaser timer events don't accrue elapsed time while paused; resuming
    // restarts the delay. Modelling that needs a hook on assignment, since
    // the game sets `.paused` directly.
    Object.defineProperty(ev, 'paused', {
      get: () => paused,
      set: (v) => {
        const was = paused;
        paused = !!v;
        if (was && !paused) ev.nextAt = clock.now + ev.delay;
      }
    });
    this.events.push(ev);
    return ev;
  }

  delayedCall(delay, callback, args, callbackScope) {
    return this.addEvent({ delay, callback, args, callbackScope });
  }

  /** Run every timer that is due within the next `ms`, in order. */
  advance(ms) {
    const target = this.now + ms;
    let guard = 0;
    for (;;) {
      if (++guard > 20000) throw new Error('FakeClock.advance: runaway timer');
      let next = null;
      for (const ev of this.events) {
        if (ev.removed || ev.paused) continue;
        if (ev.nextAt <= target && (next === null || ev.nextAt < next.nextAt)) next = ev;
      }
      if (!next) break;
      this.now = next.nextAt;
      next.fired += 1;
      if (next.loop || next.fired <= next.repeat) next.nextAt = this.now + next.delay;
      else next.removed = true;
      if (next.callback) next.callback.apply(next.callbackScope, next.args);
    }
    this.now = target;
  }
}

// ----------------------------------------------------------- game objects ---

function makeBody(owner, width, height) {
  return {
    gameObject: owner,
    width,
    height,
    velocity: { x: 0, y: 0 },
    gravityY: 0,
    allowGravity: true,
    immovable: false,
    isCircle: false,
    radius: 0,
    blocked: { up: false, down: false, left: false, right: false },
    touching: { none: true, up: false, down: false, left: false, right: false },
    setGravityY(v) { this.gravityY = v; return this; },
    setCircle(r) {
      this.isCircle = true;
      this.radius = r;
      this.width = r * 2;
      this.height = r * 2;
      return this;
    },
    setSize(w, h) { this.width = w; this.height = h; return this; }
  };
}

/** One display-list object. Covers every Phaser method the game calls. */
class FakeObject {
  constructor(scene, type, props = {}) {
    this.scene = scene;
    this.type = type;
    this.x = 0;
    this.y = 0;
    this.alpha = 1;
    this.depth = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.active = true;
    this.destroyed = false;
    this.interactive = false;
    this.text = '';
    this.tint = null;
    this.strokeColor = null;
    this.group = null;
    this.body = null;
    this.handlers = new Map();
    Object.assign(this, props);
    scene.children.list.push(this);
  }

  // --- chainable no-ops / setters -----------------------------------------
  setOrigin() { return this; }
  setScale(x, y) { this.scaleX = x; this.scaleY = y === undefined ? x : y; return this; }
  setAlpha(a) { this.alpha = a; return this; }
  setDepth(d) { this.depth = d; return this; }
  setVisible(v) { this.visible = v; return this; }
  setStrokeStyle(w, color) { this.strokeWidth = w; this.strokeColor = color; return this; }
  setInteractive() { this.interactive = true; return this; }
  disableInteractive() { this.interactive = false; return this; }
  setText(t) { this.text = String(t); return this; }
  setTint(t) { this.tint = t; return this; }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setImmovable(v) { if (this.body) this.body.immovable = v !== false; return this; }
  setCollideWorldBounds(v) { this.collideWorldBounds = v !== false; return this; }
  setVelocity(x, y) { this.body.velocity.x = x; this.body.velocity.y = y === undefined ? x : y; return this; }
  setVelocityX(x) { this.body.velocity.x = x; return this; }
  setVelocityY(y) { this.body.velocity.y = y; return this; }

  // --- DOM element wrapper (add.dom().createFromHTML()) -------------------
  createFromHTML(html) {
    this.html = html;
    this.scene.__env.registerHtml(html);
    return this;
  }

  // --- events -------------------------------------------------------------
  on(event, fn) {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event).push(fn);
    return this;
  }
  off(event) { this.handlers.delete(event); return this; }
  emit(event, ...args) {
    for (const fn of (this.handlers.get(event) || []).slice()) fn(...args);
    return this;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.active = false;
    const list = this.scene.children.list;
    const i = list.indexOf(this);
    if (i > -1) list.splice(i, 1);
    // Phaser Groups listen for the child's DESTROY event and remove it,
    // which splices the group's entries array.
    if (this.group) this.group.__remove(this);
  }

  // geometry helpers used by the fake physics step
  get width() { return this.__w * this.scaleX; }
  set width(v) { this.__w = v; }
  get height() { return this.__h * this.scaleY; }
  set height(v) { this.__h = v; }
  get left() { return this.x - this.bodyWidth / 2; }
  get right() { return this.x + this.bodyWidth / 2; }
  get top() { return this.y - this.bodyHeight / 2; }
  get bottom() { return this.y + this.bodyHeight / 2; }
  get bodyWidth() { return this.body ? this.body.width : this.width || 0; }
  get bodyHeight() { return this.body ? this.body.height : this.height || 0; }
}

/** Stand-in for Phaser.GameObjects.Group / Physics.Arcade.Group. */
class FakeGroup {
  constructor(scene, { isStatic = false } = {}) {
    this.scene = scene;
    this.isStatic = isStatic;
    this.entries = [];
    const entries = this.entries;
    this.children = {
      get list() { return entries; },
      get size() { return entries.length; },
      // Faithful to Phaser Structs.Set#iterate: length is read once, the live
      // array is indexed, and returning false breaks out.
      iterate(callback, context) {
        const len = entries.length;
        for (let i = 0; i < len; i++) {
          const entry = entries[i];
          if (context) { if (callback.call(context, entry, i) === false) break; }
          else if (callback(entry, i) === false) break;
        }
        return this;
      }
    };
  }

  create(x, y, textureKey) {
    const dims = this.scene.__env.textures.get(textureKey) || { width: 1, height: 1 };
    const obj = new FakeObject(this.scene, 'sprite', {
      x, y, texture: textureKey, width: dims.width, height: dims.height
    });
    obj.body = makeBody(obj, dims.width, dims.height);
    if (this.isStatic) obj.body.allowGravity = false;
    obj.group = this;
    this.entries.push(obj);
    return obj;
  }

  add(obj) { obj.group = this; this.entries.push(obj); return this; }
  getChildren() { return this.entries; }
  countActive() { return this.entries.filter((e) => e.active).length; }
  __remove(obj) {
    const i = this.entries.indexOf(obj);
    if (i > -1) this.entries.splice(i, 1);
  }
}

// ----------------------------------------------------------------- scene ---

function installSceneSystems(scene, env) {
  scene.__env = env;
  scene.children = { list: [] };
  scene.__clock = new FakeClock();
  scene.__colliders = [];
  scene.__overlaps = [];
  scene.__flashes = [];
  scene.__shakes = [];
  scene.__emitted = [];
  scene.__graphics = [];
  scene.__tweens = [];
  scene.__physicsPaused = false;
  scene.__sceneStarts = [];
  scene.__restarts = 0;
  scene.__inputHandlers = new Map();

  const mk = (type, props) => new FakeObject(scene, type, props);

  scene.add = {
    text: (x, y, text, style) => mk('text', { x, y, text: String(text), style, width: 0, height: 0 }),
    rectangle: (x, y, w, h, color, alpha) => mk('rectangle', { x, y, width: w, height: h, fillColor: color, alpha: alpha === undefined ? 1 : alpha }),
    circle: (x, y, r, color) => mk('circle', { x, y, radius: r, width: r * 2, height: r * 2, fillColor: color }),
    ellipse: (x, y, w, h, color, alpha) => mk('ellipse', {
      x, y, width: w, height: h, fillColor: color, alpha: alpha === undefined ? 1 : alpha
    }),
    tileSprite: (x, y, w, h, key) => mk('tileSprite', {
      x, y, width: w, height: h, texture: key, tilePositionX: 0, tilePositionY: 0
    }),
    image: (x, y, key) => {
      const d = env.textures.get(key) || { width: 0, height: 0 };
      return mk('image', { x, y, texture: key, width: d.width, height: d.height });
    },
    sprite: (x, y, key) => {
      const d = env.textures.get(key) || { width: 0, height: 0 };
      return mk('sprite', { x, y, texture: key, width: d.width, height: d.height });
    },
    dom: (x, y) => mk('dom', { x, y }),
    graphics: () => {
      const g = mk('graphics', {});
      g.__ops = [];
      scene.__graphics.push(g);   // kept after destroy() so tests can read ops
      const record = (name) => (...args) => { g.__ops.push([name, ...args]); return g; };
      for (const name of ['clear', 'fillStyle', 'lineStyle', 'fillRect', 'fillRoundedRect',
        'fillTriangle', 'strokeTriangle', 'fillCircle', 'fillEllipse', 'strokeCircle',
        'strokeEllipse', 'strokeRoundedRect', 'lineBetween', 'strokeRect', 'beginPath',
        'closePath', 'strokePath', 'fillPath', 'moveTo', 'lineTo']) g[name] = record(name);
      g.generateTexture = (key, width, height) => {
        env.textures.set(key, { key, width, height });
        g.__ops.push(['generateTexture', key, width, height]);
        return g;
      };
      return g;
    },
    particles: (x, y, key, config) => {
      const p = mk('particles', { x, y, texture: key, config });
      p.emits = [];
      p.emitParticleAt = (ex, ey, count) => { p.emits.push({ x: ex, y: ey, count }); scene.__emitted.push({ x: ex, y: ey, count }); return p; };
      p.start = () => p;
      p.stop = () => p;
      return p;
    }
  };

  scene.physics = {
    add: {
      sprite: (x, y, key) => {
        const d = env.textures.get(key) || { width: 1, height: 1 };
        const obj = mk('sprite', { x, y, texture: key, width: d.width, height: d.height });
        obj.body = makeBody(obj, d.width, d.height);
        return obj;
      },
      staticGroup: () => new FakeGroup(scene, { isStatic: true }),
      group: () => new FakeGroup(scene),
      collider: (a, b, cb) => { const c = { a, b, callback: cb }; scene.__colliders.push(c); return c; },
      overlap: (a, b, cb) => { const o = { a, b, callback: cb }; scene.__overlaps.push(o); return o; }
    },
    pause: () => { scene.__physicsPaused = true; },
    resume: () => { scene.__physicsPaused = false; },
    world: { gravity: { x: 0, y: 0 } }
  };

  scene.cameras = {
    main: {
      setBackgroundColor: (c) => { scene.__bgColor = c; },
      flash: (dur, r, g, b) => scene.__flashes.push({ dur, r, g, b }),
      shake: (dur, intensity) => scene.__shakes.push({ dur, intensity })
    }
  };

  scene.input = {
    on: (event, fn) => {
      if (!scene.__inputHandlers.has(event)) scene.__inputHandlers.set(event, []);
      scene.__inputHandlers.get(event).push(fn);
    },
    keyboard: {
      on: (event, fn) => {
        if (!scene.__inputHandlers.has(event)) scene.__inputHandlers.set(event, []);
        scene.__inputHandlers.get(event).push(fn);
      }
    }
  };

  scene.time = {
    get now() { return scene.__clock.now; },
    addEvent: (cfg) => scene.__clock.addEvent(cfg),
    delayedCall: (delay, cb, args, ctx) => scene.__clock.delayedCall(delay, cb, args, ctx)
  };

  scene.tweens = {
    add: (cfg) => {
      scene.__tweens.push(cfg);
      const at = (cfg.delay || 0) + (cfg.duration || 0);
      scene.__clock.delayedCall(at, () => {
        const targets = Array.isArray(cfg.targets) ? cfg.targets : [cfg.targets];
        for (const t of targets) if (typeof cfg.alpha === 'number') t.alpha = cfg.alpha;
        if (cfg.onComplete) cfg.onComplete();
      });
      return cfg;
    }
  };

  scene.scene = {
    start: (key, data) => { scene.__sceneStarts.push({ key, data }); },
    restart: (data) => { scene.__restarts += 1; scene.__sceneStarts.push({ key: '__restart', data }); },
    stop: () => {},
    launch: (key) => { scene.__sceneStarts.push({ key, launched: true }); }
  };

  scene.sys = { settings: { key: scene.__key } };
}

// ------------------------------------------------------------ environment ---

class FakeStorage {
  constructor() {
    this.map = new Map();
    this.throwOnGet = false;
    this.throwOnSet = false;
  }
  getItem(key) {
    if (this.throwOnGet) throw new Error('SecurityError: storage disabled');
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    if (this.throwOnSet) throw new Error('SecurityError: storage disabled');
    this.map.set(key, String(value));
  }
  removeItem(key) { this.map.delete(key); }
  clear() { this.map.clear(); }
}

/**
 * Boot a fresh sandbox with the real game source loaded.
 * Returns { g, storage, textures, Phaser, setRandom, setNow, ... }.
 */
function loadGame({ storage = new FakeStorage(), now = Date.parse('2026-07-30T12:00:00Z') } = {}) {
  const textures = new Map();
  const elements = new Map();
  const env = {
    textures,
    elements,
    registerHtml(html) {
      const id = /\bid\s*=\s*"([^"]*)"/.exec(html);
      const value = /\bvalue\s*=\s*"([^"]*)"/.exec(html);
      const maxlength = /\bmaxlength\s*=\s*"([^"]*)"/.exec(html);
      if (id) {
        elements.set(id[1], {
          id: id[1],
          value: value ? value[1] : '',
          maxLength: maxlength ? Number(maxlength[1]) : undefined
        });
      }
    }
  };

  let randomFn = Math.random;

  // ---- fake Phaser -------------------------------------------------------
  class Scene {
    constructor(config) {
      this.__key = typeof config === 'string' ? config : (config && config.key);
      installSceneSystems(this, env);
    }
  }

  const Phaser = {
    AUTO: 'AUTO',
    CANVAS: 'CANVAS',
    Scene,
    // Scale Manager constants. Real values from Phaser 3; the game must declare
    // FIT/CENTER_BOTH or the canvas renders at a fixed size and gets clipped on
    // any device narrower than 480 CSS px.
    Scale: {
      NONE: 0, WIDTH_CONTROLS_HEIGHT: 1, HEIGHT_CONTROLS_WIDTH: 2,
      FIT: 3, ENVELOP: 4, RESIZE: 5, EXPAND: 6,
      NO_CENTER: 0, CENTER_BOTH: 1, CENTER_HORIZONTALLY: 2, CENTER_VERTICALLY: 3
    },
    Math: {
      Between: (min, max) => Math.floor(randomFn() * (max - min + 1)) + min,
      FloatBetween: (min, max) => randomFn() * (max - min) + min,
      Clamp: (v, min, max) => Math.min(Math.max(v, min), max)
    },
    Game: class Game {
      constructor(config) {
        this.config = config;
        Phaser.Game.instances.push(this);
      }
    },
    Geom: { Rectangle: class Rectangle {} }
  };
  Phaser.Game.instances = [];

  // ---- fake DOM ----------------------------------------------------------
  const domEvents = new Map();
  const appended = [];
  const documentStub = {
    body: {
      appendChild: (node) => { appended.push(node); return node; },
      style: {}
    },
    createElement: () => ({ style: { cssText: '' }, textContent: '', appendChild() {} }),
    getElementById: (id) => elements.get(id) || null,
    addEventListener: (evt, fn) => {
      if (!domEvents.has(evt)) domEvents.set(evt, []);
      domEvents.get(evt).push(fn);
    }
  };
  const windowStub = {
    addEventListener: (evt, fn) => {
      if (!domEvents.has(evt)) domEvents.set(evt, []);
      domEvents.get(evt).push(fn);
    },
    AudioContext: undefined,
    webkitAudioContext: undefined
  };

  const sandbox = {
    Phaser,
    localStorage: storage,
    window: windowStub,
    document: documentStub,
    console,
    navigator: { userAgent: 'node-test' },
    setTimeout,
    clearTimeout
  };
  const context = vm.createContext(sandbox);
  const ctxGlobal = context; // contextified object proxies the real global

  // Route the sandbox realm's Math.random through the injectable hook, so a
  // test that stubs randomness also controls Phaser.Math.Between.
  vm.runInContext('Math.random = () => globalThis.__random();', context);
  sandbox.__random = () => randomFn();

  // Freezable clock for Date.now() / new Date().
  let nowMs = now;
  vm.runInContext(`
    (() => {
      const RealDate = Date;
      class FrozenDate extends RealDate {
        constructor(...args) {
          if (args.length === 0) super(globalThis.__now());
          else super(...args);
        }
        static now() { return globalThis.__now(); }
      }
      globalThis.Date = FrozenDate;
    })();
  `, context);
  sandbox.__now = () => nowMs;

  const source = extractGameSource();
  const epilogue = `\n;globalThis.__game = { ${EXPORTS.map((n) => `${n}: typeof ${n} !== 'undefined' ? ${n} : undefined`).join(', ')} };\n`;
  vm.runInContext(source + epilogue, context, { filename: 'index.html:inline-script' });

  const g = sandbox.__game;
  const missing = EXPORTS.filter((n) => g[n] === undefined);
  if (missing.length) throw new Error(`index.html no longer defines: ${missing.join(', ')}`);

  return {
    g,
    Phaser,
    env,
    storage,
    textures,
    elements,
    appended,
    context,
    sandbox,
    domEvents,
    /** Fire a window/document-level listener registered by the game. */
    fireWindowEvent(evt, payload) {
      for (const fn of domEvents.get(evt) || []) fn(payload);
    },
    setRandom(fn) { randomFn = typeof fn === 'function' ? fn : () => fn; },
    setNow(ms) { nowMs = typeof ms === 'number' ? ms : Date.parse(ms); },
    getNow() { return nowMs; },
    /** Write a save blob straight to storage (test setup shortcut). */
    seedSave(partial) {
      const full = Object.assign(g.loadSave(), partial);
      storage.setItem(g.SAVE_KEY, JSON.stringify(full));
      return full;
    },
    readSave() { return g.loadSave(); },
    /** Run BootScene so procedural textures (and their sizes) exist. */
    boot() {
      const boot = new g.BootScene();
      boot.create();
      return boot;
    }
  };
}

// ------------------------------------------------------------- test utils ---

/**
 * Copy a value out of the sandbox realm into host plain objects.
 * Needed because assert.deepStrictEqual compares prototypes, and objects
 * created inside the vm context have that context's Object/Array prototypes.
 */
function plain(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

/** Every display object of a scene whose text contains `needle`. */
function findTexts(scene, needle) {
  return scene.children.list.filter(
    (o) => o.type === 'text' && String(o.text).includes(needle)
  );
}

function findText(scene, needle) {
  return findTexts(scene, needle)[0] || null;
}

function hasText(scene, needle) {
  return findTexts(scene, needle).length > 0;
}

/**
 * Click the button labelled `label`. Buttons in this game are a rectangle
 * plus a separate centred text object, so this finds the label, then the
 * nearest interactive object to it (falling back to the label itself).
 */
function clickButton(scene, label) {
  const labels = findTexts(scene, label);
  if (labels.length === 0) throw new Error(`no button labelled "${label}"`);
  const target = labels[0];
  let best = null;
  let bestDist = Infinity;
  for (const o of scene.children.list) {
    if (!o.interactive) continue;
    const d = Math.hypot(o.x - target.x, o.y - target.y);
    if (d < bestDist) { bestDist = d; best = o; }
  }
  if (!best || bestDist > 60) {
    if (target.interactive) { target.emit('pointerdown'); return target; }
    throw new Error(`button "${label}" is not interactive`);
  }
  best.emit('pointerdown');
  return best;
}

function tap(scene) {
  for (const fn of (scene.__inputHandlers.get('pointerdown') || []).slice()) {
    fn({ x: 0, y: 0 });
  }
}

function pressSpace(scene) {
  for (const fn of (scene.__inputHandlers.get('keydown-SPACE') || []).slice()) {
    fn({ key: ' ' });
  }
}

function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function expand(target) {
  if (target instanceof FakeGroup) return target.entries.filter((e) => e.active);
  return Array.isArray(target) ? target : [target];
}

/**
 * One simulated frame: gravity, velocity integration, ground collision,
 * overlap callbacks, timers, then Scene.update().
 */
function runFrame(scene, deltaMs = 16) {
  const dt = deltaMs / 1000;
  if (!scene.__physicsPaused) {
    const bodies = scene.children.list.filter((o) => o.body);
    for (const o of bodies) {
      if (o.body.allowGravity) o.body.velocity.y += o.body.gravityY * dt;
      o.x += o.body.velocity.x * dt;
      o.y += o.body.velocity.y * dt;
      o.body.blocked.down = false;
      o.body.touching.down = false;
    }
    for (const c of scene.__colliders) {
      for (const a of expand(c.a)) {
        for (const b of expand(c.b)) {
          if (!overlaps(a, b)) continue;
          // only downward resolution is needed for this game (runner on ground)
          if (a.body && a.body.velocity.y >= 0) {
            a.y = b.top - a.bodyHeight / 2;
            a.body.velocity.y = 0;
            a.body.blocked.down = true;
            a.body.touching.down = true;
          }
          if (c.callback) c.callback(a, b);
        }
      }
    }
    for (const o of scene.__overlaps) {
      for (const a of expand(o.a)) {
        for (const b of expand(o.b)) {
          if (a !== b && overlaps(a, b) && o.callback) o.callback(a, b);
        }
      }
    }
  }
  scene.__clock.advance(deltaMs);
  if (typeof scene.update === 'function') scene.update(scene.__clock.now, deltaMs);
}

function runFrames(scene, count, deltaMs = 16) {
  for (let i = 0; i < count; i++) runFrame(scene, deltaMs);
}

/**
 * Run frames until the player is standing on the ground, so jump() is allowed.
 * The player spawns ~3px clear of the ground line, so this takes a few frames.
 */
function groundPlayer(scene, maxFrames = 30) {
  for (let i = 0; i < maxFrames; i++) {
    runFrame(scene, 16);
    if (scene.player.body.blocked.down || scene.player.body.touching.down) return true;
  }
  throw new Error('groundPlayer: the player never landed');
}

module.exports = {
  INDEX_HTML,
  EXPORTS,
  readIndexHtml,
  readScriptTags,
  extractGameSource,
  loadGame,
  FakeStorage,
  FakeClock,
  FakeGroup,
  FakeObject,
  plain,
  findText,
  findTexts,
  hasText,
  clickButton,
  tap,
  pressSpace,
  runFrame,
  runFrames,
  groundPlayer,
  overlaps
};
