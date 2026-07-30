'use strict';
// Unit tests for regenEnergy() — the energy gate that paces sessions.
// One point regenerates every 30s (demo pacing) up to a cap of 5.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('../harness');

const REGEN_MS = 30000;
const CAP = 5;

/** Build a profile sitting at `count` energy, last touched `agoMs` ago. */
function profileAt(env, count, agoMs) {
  const s = env.g.loadSave();
  s.energy.count = count;
  s.energy.last = env.getNow() - agoMs;
  return s;
}

test('no elapsed time regenerates nothing', () => {
  const env = loadGame();
  const s = env.g.regenEnergy(profileAt(env, 2, 0));
  assert.equal(s.energy.count, 2);
});

test('a partial interval regenerates nothing', () => {
  const env = loadGame();
  const s = env.g.regenEnergy(profileAt(env, 2, REGEN_MS - 1));
  assert.equal(s.energy.count, 2);
});

test('one full interval regenerates exactly one point', () => {
  const env = loadGame();
  const s = env.g.regenEnergy(profileAt(env, 2, REGEN_MS));
  assert.equal(s.energy.count, 3);
  assert.equal(s.energy.last, env.getNow(), 'the timer restarts from now');
});

test('several intervals regenerate several points', () => {
  const env = loadGame();
  const s = env.g.regenEnergy(profileAt(env, 1, REGEN_MS * 3));
  assert.equal(s.energy.count, 4);
});

test('regeneration is capped at 5 no matter how long the player was away', () => {
  const env = loadGame();
  const s = env.g.regenEnergy(profileAt(env, 0, REGEN_MS * 1000));
  assert.equal(s.energy.count, CAP);
});

test('an already-full bar stays full and keeps its timestamp fresh', () => {
  const env = loadGame();
  const s = env.g.regenEnergy(profileAt(env, CAP, REGEN_MS * 10));
  assert.equal(s.energy.count, CAP);
  assert.equal(s.energy.last, env.getNow(),
    'so the next spend starts a fresh 30s window rather than refilling instantly');
});

test('partial progress accumulates across repeated calls', () => {
  const env = loadGame();
  const start = env.getNow();
  let s = profileAt(env, 0, 0);

  // Opening the menu three times inside one interval must not reset progress.
  for (const t of [10000, 20000, 29000]) {
    env.setNow(start + t);
    s = env.g.regenEnergy(s);
    assert.equal(s.energy.count, 0, `still empty at ${t}ms`);
    assert.equal(s.energy.last, start, 'last is left untouched while below the threshold');
  }
  env.setNow(start + REGEN_MS);
  s = env.g.regenEnergy(s);
  assert.equal(s.energy.count, 1);
});

test('known behaviour: leftover time is discarded when a point is granted', () => {
  const env = loadGame();
  const start = env.getNow();
  // 59s away => 1 point, and the remaining 29s are dropped rather than carried.
  let s = env.g.regenEnergy(profileAt(env, 0, REGEN_MS * 2 - 1));
  assert.equal(s.energy.count, 1);
  assert.equal(s.energy.last, start);

  env.setNow(start + 1000);
  s = env.g.regenEnergy(s);
  assert.equal(s.energy.count, 1, 'the dropped 29s do not count toward the next point');
});

test('regenEnergy mutates and returns the same profile object', () => {
  const env = loadGame();
  const s = profileAt(env, 1, REGEN_MS);
  assert.equal(env.g.regenEnergy(s), s);
  assert.equal(s.energy.count, 2);
});
