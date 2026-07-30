'use strict';
// Unit tests for the daily login streak (checkLoginStreak / loginStreakReward).
//
// All anchors are built in LOCAL time, because the game compares
// Date#toDateString() values — using UTC offsets here would make the tests
// fail in some timezones and around DST changes.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('../harness');

const localNoon = (y, m, d) => new Date(y, m, d, 12, 0, 0, 0).getTime();
const dayString = (ms) => new Date(ms).toDateString();

const JUL_13 = localNoon(2026, 6, 13);
const JUL_14 = localNoon(2026, 6, 14);
const JUL_15 = localNoon(2026, 6, 15);
const JUL_17 = localNoon(2026, 6, 17);

test('a brand new player starts on day 1', () => {
  const env = loadGame({ now: JUL_15 });
  const s = env.g.checkLoginStreak(env.g.loadSave());

  assert.equal(s.loginStreak.count, 1);
  assert.equal(s.loginStreak.lastDay, dayString(JUL_15));
  assert.equal(s.loginStreak.claimedToday, false);
});

test('logging in again the same day changes nothing', () => {
  const env = loadGame({ now: JUL_15 });
  let s = env.g.checkLoginStreak(env.g.loadSave());
  s.loginStreak.claimedToday = true;

  s = env.g.checkLoginStreak(s);
  assert.equal(s.loginStreak.count, 1, 'the streak does not double-count one day');
  assert.equal(s.loginStreak.claimedToday, true, 'and an already-claimed bonus stays claimed');
});

test('logging in the next day extends the streak and re-arms the claim', () => {
  const env = loadGame({ now: JUL_14 });
  let s = env.g.checkLoginStreak(env.g.loadSave());
  s.loginStreak.claimedToday = true;
  assert.equal(s.loginStreak.count, 1);

  env.setNow(JUL_15);
  s = env.g.checkLoginStreak(s);
  assert.equal(s.loginStreak.count, 2);
  assert.equal(s.loginStreak.lastDay, dayString(JUL_15));
  assert.equal(s.loginStreak.claimedToday, false, 'a new day means a new bonus to claim');
});

test('consecutive days keep incrementing', () => {
  const env = loadGame({ now: JUL_13 });
  let s = env.g.checkLoginStreak(env.g.loadSave());
  env.setNow(JUL_14);
  s = env.g.checkLoginStreak(s);
  env.setNow(JUL_15);
  s = env.g.checkLoginStreak(s);
  assert.equal(s.loginStreak.count, 3);
});

test('a skipped day breaks the streak back to day 1', () => {
  const env = loadGame({ now: JUL_15 });
  let s = env.g.checkLoginStreak(env.g.loadSave());
  s.loginStreak.count = 6; // pretend a six-day run
  s.loginStreak.claimedToday = true;

  env.setNow(JUL_17); // one whole day missed
  s = env.g.checkLoginStreak(s);
  assert.equal(s.loginStreak.count, 1);
  assert.equal(s.loginStreak.lastDay, dayString(JUL_17));
  assert.equal(s.loginStreak.claimedToday, false);
});

test('a returning player with an unrecognised lastDay restarts at day 1', () => {
  const env = loadGame({ now: JUL_15 });
  const s = env.g.loadSave();
  s.loginStreak = { lastDay: 'not a date', count: 99, claimedToday: true };

  env.g.checkLoginStreak(s);
  assert.equal(s.loginStreak.count, 1);
});

test('the reward escalates across the 7-day cycle with a day-7 spike', () => {
  const { g } = loadGame();
  assert.equal(g.loginStreakReward(1), 10);
  assert.equal(g.loginStreakReward(2), 20);
  assert.equal(g.loginStreakReward(3), 30);
  assert.equal(g.loginStreakReward(4), 40);
  assert.equal(g.loginStreakReward(5), 50);
  assert.equal(g.loginStreakReward(6), 60);
  assert.equal(g.loginStreakReward(7), 110, 'day 7 is the big do-not-break-the-chain payout');
});

test('the reward cycle repeats every 7 days', () => {
  const { g } = loadGame();
  assert.equal(g.loginStreakReward(8), 10);
  assert.equal(g.loginStreakReward(9), 20);
  assert.equal(g.loginStreakReward(14), 110);
  assert.equal(g.loginStreakReward(15), 10);
  assert.equal(g.loginStreakReward(70), 110);
});

test('the reward never goes negative or NaN for a day-0 profile', () => {
  const { g } = loadGame();
  const r = g.loginStreakReward(0);
  assert.equal(Number.isFinite(r), true);
  assert.ok(r >= 0, `expected a non-negative reward, got ${r}`);
});
