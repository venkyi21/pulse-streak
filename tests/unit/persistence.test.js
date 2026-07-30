'use strict';
// Unit tests for the save layer: loadSave / save / safeGetItem / safeSetItem.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame, FakeStorage, plain } = require('../harness');

test('loadSave returns a complete default profile when storage is empty', () => {
  const { g } = loadGame();
  const s = g.loadSave();

  assert.equal(s.shards, 0);
  assert.equal(s.best, 0);
  assert.deepEqual(plain(s.upgrades), { jump: 0, magnet: 0, guard: 0 });
  assert.deepEqual(plain(s.trails), ['0x37e6ff']);
  assert.equal(s.equipped, '0x37e6ff');
  assert.deepEqual(plain(s.leaderboard), []);
  assert.equal(s.energy.count, 5, 'a new player starts with a full energy bar');
  assert.equal(typeof s.energy.last, 'number');
  assert.deepEqual(plain(s.loginStreak), { lastDay: '', count: 0, claimedToday: false });
});

test('the default profile is a fresh object each call (no shared mutable state)', () => {
  const { g } = loadGame();
  const a = g.loadSave();
  a.upgrades.jump = 4;
  a.trails.push('0xff4d9d');

  const b = g.loadSave();
  assert.equal(b.upgrades.jump, 0);
  assert.deepEqual(plain(b.trails), ['0x37e6ff']);
});

test('save/loadSave round-trips the whole profile', () => {
  const { g, storage } = loadGame();
  const written = {
    shards: 137,
    best: 42,
    upgrades: { jump: 2, magnet: 1, guard: 3 },
    trails: ['0x37e6ff', '0xffdd3c'],
    equipped: '0xffdd3c',
    leaderboard: [{ name: 'ABC', score: 42 }],
    energy: { count: 2, last: 1000 },
    loginStreak: { lastDay: 'Mon Jul 27 2026', count: 3, claimedToday: true }
  };
  g.save(written);

  assert.equal(storage.map.has(g.SAVE_KEY), true, 'writes under the versioned key');
  assert.deepEqual(plain(g.loadSave()), written);
});

test('the save key is namespaced and versioned', () => {
  const { g } = loadGame();
  assert.equal(g.SAVE_KEY, 'pulse_streak_save_v1');
});

test('corrupt JSON in storage falls back to defaults instead of throwing', () => {
  const { g, storage } = loadGame();
  storage.setItem(g.SAVE_KEY, '{not json at all');

  const s = g.loadSave();
  assert.equal(s.shards, 0);
  assert.equal(s.energy.count, 5);
});

test('a save written by an older build is upgraded with the missing fields', () => {
  const { g, storage } = loadGame();
  // v0-shaped blob: no energy, no loginStreak, no trails
  storage.setItem(g.SAVE_KEY, JSON.stringify({ shards: 90, best: 12 }));

  const s = g.loadSave();
  assert.equal(s.shards, 90, 'existing fields survive');
  assert.equal(s.best, 12);
  assert.deepEqual(plain(s.upgrades), { jump: 0, magnet: 0, guard: 0 }, 'missing fields defaulted');
  assert.equal(s.energy.count, 5);
  assert.equal(s.loginStreak.count, 0);
  assert.deepEqual(plain(s.trails), ['0x37e6ff']);
});

test('partially-populated nested objects are merged field by field', () => {
  const { g, storage } = loadGame();
  storage.setItem(g.SAVE_KEY, JSON.stringify({
    upgrades: { jump: 3 },
    energy: { count: 1 },
    loginStreak: { count: 5 }
  }));

  const s = g.loadSave();
  assert.deepEqual(plain(s.upgrades), { jump: 3, magnet: 0, guard: 0 });
  assert.equal(s.energy.count, 1);
  assert.equal(typeof s.energy.last, 'number', 'energy.last defaulted so regen still works');
  assert.equal(s.loginStreak.count, 5);
  assert.equal(s.loginStreak.lastDay, '');
});

test('a localStorage that throws on read degrades to defaults, not a crash', () => {
  const storage = new FakeStorage();
  storage.throwOnGet = true;
  const { g } = loadGame({ storage });

  // This is the file:// SecurityError path that used to blank the screen.
  assert.doesNotThrow(() => g.loadSave());
  assert.equal(g.loadSave().energy.count, 5);
});

test('a localStorage that throws on write keeps the profile alive in memory', () => {
  const storage = new FakeStorage();
  storage.throwOnSet = true;
  const { g } = loadGame({ storage });

  const s = g.loadSave();
  s.shards = 55;
  s.best = 9;
  assert.doesNotThrow(() => g.save(s));
  assert.equal(storage.map.size, 0, 'nothing reached real storage');

  // Reads now come from the in-memory fallback, so the session continues.
  assert.equal(g.loadSave().shards, 55);
  assert.equal(g.loadSave().best, 9);
});

test('the in-memory fallback is key-agnostic (documented single-key limitation)', () => {
  const storage = new FakeStorage();
  storage.throwOnSet = true;
  storage.throwOnGet = true;
  const { g } = loadGame({ storage });

  g.safeSetItem('some_other_key', 'payload');
  // Only one key is ever used, so the fallback stores a single value and any
  // read returns it. Recorded here so a future second key doesn't silently
  // collide with the save blob.
  assert.equal(g.safeGetItem(g.SAVE_KEY), 'payload');
});

test('safeGetItem returns null (not undefined) for a missing key', () => {
  const { g } = loadGame();
  assert.equal(g.safeGetItem('never_written'), null);
});
