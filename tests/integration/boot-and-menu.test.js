'use strict';
// Integration tests: BootScene texture generation, then MenuScene as a whole —
// what it renders, what it persists on entry, and the energy gate on PLAY.

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  loadGame, findText, hasText, clickButton, plain, extractGameSource
} = require('../harness');

/** Boot, then open the menu, exactly as the game does. */
function openMenu(env) {
  env.boot();
  const menu = new env.g.MenuScene();
  menu.create();
  return menu;
}

test('Boot generates every texture at the size the scenes assume, then starts Menu', () => {
  const env = loadGame();
  const boot = env.boot();

  assert.deepEqual(plain([...env.textures.keys()].sort()),
    ['cloud', 'ground', 'hillFar', 'hillMid', 'hillNear', 'particle', 'player',
      'shard', 'sky', 'stork', 'sun', 'verge']);
  assert.deepEqual(plain(env.textures.get('player')), { key: 'player', width: 34, height: 34 });
  assert.deepEqual(plain(env.textures.get('stork')), { key: 'stork', width: 50, height: 50 },
    'the stork must stay exactly spike-sized or the jump timing changes');
  assert.deepEqual(plain(env.textures.get('shard')), { key: 'shard', width: 18, height: 18 });
  assert.equal(env.textures.get('ground').width, env.g.W, 'the ground strip spans the screen');
  assert.equal(env.textures.get('ground').height, 90);

  // Background layers: each scrolling texture must be exactly one screen wide,
  // or tiling it leaves a visible seam marching across the sky.
  for (const key of ['sky', 'hillFar', 'hillMid', 'hillNear', 'verge']) {
    assert.equal(env.textures.get(key).width, env.g.W, `${key} must be W wide to tile seamlessly`);
  }
  assert.equal(env.textures.get('sky').height, env.g.GROUND_Y, 'the sky reaches the ground line');
  // The three hill bands stack up to the ground line from their placements.
  assert.equal(468 + env.textures.get('hillFar').height, env.g.GROUND_Y);
  assert.equal(538 + env.textures.get('hillMid').height, env.g.GROUND_Y);
  assert.equal(608 + env.textures.get('hillNear').height, env.g.GROUND_Y);

  assert.deepEqual(plain(boot.__sceneStarts.map((s) => s.key)), ['Menu']);
});

test('the player is drawn as a round critter with a face, not a plain blob', () => {
  const env = loadGame();
  const boot = env.boot();

  // Ops recorded up to the point the player texture is baked. Intentionally
  // counts shapes rather than pinning coordinates, so the art can be nudged
  // without breaking the test — but a regression to a bare rectangle fails.
  const ops = boot.__graphics[0].__ops;
  const upToPlayer = ops.slice(0, ops.findIndex(
    (o) => o[0] === 'generateTexture' && o[1] === 'player'
  ));
  const count = (name) => upToPlayer.filter((o) => o[0] === name).length;

  assert.ok(count('fillCircle') >= 8,
    `expected a body/ears/eyes/blush built from circles, saw ${count('fillCircle')}`);
  assert.ok(count('fillEllipse') >= 3, 'expected a snout/mouth and paws');
  assert.equal(count('fillRoundedRect'), 0, 'the old rounded-rect blob is gone');
  assert.ok(count('fillStyle') >= 6, 'a multi-coloured character, not a silhouette');
});

test('Boot releases its scratch Graphics object', () => {
  const env = loadGame();
  const boot = env.boot();
  const graphics = boot.children.list.filter((o) => o.type === 'graphics');
  assert.equal(graphics.length, 0, 'the graphics object destroys itself after generating textures');
});

test('the menu shows title, stats, and both navigation buttons', () => {
  const env = loadGame();
  const menu = openMenu(env);

  assert.ok(hasText(menu, 'PULSE STREAK'));
  assert.ok(hasText(menu, 'Shards: 0'));
  assert.ok(hasText(menu, 'Best Score: 0'));
  assert.ok(hasText(menu, 'PLAY'));
  assert.ok(hasText(menu, 'SHOP / UPGRADES'));
  assert.ok(hasText(menu, 'Trail Colors'));
  assert.ok(hasText(menu, 'Local Leaderboard'));
});

test('opening the menu persists energy regen and the login streak in one write', () => {
  const env = loadGame();
  env.seedSave({ energy: { count: 1, last: env.getNow() - 60000 } });

  openMenu(env);

  const s = env.readSave();
  assert.equal(s.energy.count, 3, '60s away = +2 energy, written back to storage');
  assert.equal(s.loginStreak.count, 1, 'the streak is recorded on entry, not on play');
  assert.equal(s.loginStreak.claimedToday, false);
});

test('the energy bar renders filled and empty hearts', () => {
  const env = loadGame();
  env.seedSave({ energy: { count: 2, last: env.getNow() } });
  const menu = openMenu(env);

  assert.equal(menu.energyText.text, '♥♥♡♡♡');
});

test('PLAY spends one energy and enters the Game scene', () => {
  const env = loadGame();
  env.seedSave({ energy: { count: 3, last: env.getNow() } });
  const menu = openMenu(env);

  clickButton(menu, 'PLAY');

  assert.deepEqual(plain(menu.__sceneStarts.map((s) => s.key)), ['Game']);
  assert.equal(env.readSave().energy.count, 2, 'the spend is committed before the scene switches');
});

test('PLAY on an empty bar blocks the run and says when energy returns', () => {
  const env = loadGame();
  env.seedSave({ energy: { count: 0, last: env.getNow() - 10000 } });
  const menu = openMenu(env);

  clickButton(menu, 'PLAY');

  assert.deepEqual(plain(menu.__sceneStarts), [], 'the run does not start');
  assert.ok(hasText(menu, 'Out of energy'), 'the player is told why');
  assert.ok(hasText(menu, 'next heart in 20s'), 'and exactly how long to wait');
  assert.equal(env.readSave().energy.count, 0, 'and no energy went negative');
});

test('no simulated-ad theatre survives anywhere in the build', () => {
  const env = loadGame();
  env.seedSave({ energy: { count: 0, last: env.getNow() } });
  const menu = openMenu(env);
  clickButton(menu, 'PLAY');

  // The fake rewarded-ad countdowns granted their reward unconditionally, which
  // is misleading in a shipped app and a hard problem in a kids title.
  assert.equal(hasText(menu, 'Simulated'), false);
  assert.equal(hasText(menu, 'Rewarded Ad'), false);
  assert.equal(typeof menu.showAdForEnergy, 'undefined', 'the ad flow is gone, not hidden');

  // Strip comments first: the code must contain no ad copy, but the comments
  // explaining why the flow was removed are allowed to name it.
  const code = extractGameSource()
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert.equal(/Rewarded Ad/.test(code), false, 'no ad copy left in any shipped string');
  assert.equal(/watch ad/i.test(code), false, 'no "watch ad" button labels left');
});

test('the out-of-energy message handles a point already being due', () => {
  const env = loadGame();
  env.seedSave({ energy: { count: 0, last: env.getNow() - 60000 } });
  const menu = openMenu(env);

  // 60s away regenerates 2 points, so PLAY should just work rather than nag.
  clickButton(menu, 'PLAY');
  assert.deepEqual(plain(menu.__sceneStarts.map((s) => s.key)), ['Game']);
});

test('the login bonus can be claimed once, and pays the day-1 amount', () => {
  const env = loadGame();
  const menu = openMenu(env);

  assert.ok(hasText(menu, '[CLAIM +10]'), 'day 1 pays 10 shards');
  clickButton(menu, '[CLAIM +10]');

  const s = env.readSave();
  assert.equal(s.shards, 10);
  assert.equal(s.loginStreak.claimedToday, true);
  assert.equal(menu.__restarts, 1);
});

test('an already-claimed bonus shows no claim button', () => {
  const env = loadGame();
  openMenu(env);            // records the streak for today
  const s = env.readSave();
  s.loginStreak.claimedToday = true;
  env.g.save(s);

  const menu2 = new env.g.MenuScene();
  menu2.create();

  assert.ok(hasText(menu2, 'claimed today'));
  assert.equal(hasText(menu2, '[CLAIM'), false);
  assert.throws(() => clickButton(menu2, '[CLAIM'), /no button labelled/);
});

test('the streak strip lights one pip per day of the 7-day cycle', () => {
  const env = loadGame();
  env.seedSave({ loginStreak: { lastDay: '', count: 0, claimedToday: false } });
  const menu = openMenu(env);

  const pips = menu.children.list.filter((o) => o.type === 'circle' && o.radius === 6);
  assert.equal(pips.length, 7);
  assert.equal(pips.filter((p) => p.fillColor === 0xffdd3c).length, 1, 'day 1 => one lit pip');

  const env2 = loadGame();
  env2.seedSave({ loginStreak: { lastDay: 'stale', count: 4, claimedToday: false } });
  env2.boot();
  const menu2 = new env2.g.MenuScene();
  // Force a day-5 profile the way a real 5-day run would look.
  const s = env2.readSave();
  s.loginStreak = { lastDay: new Date(env2.getNow() - 86400000).toDateString(), count: 4, claimedToday: true };
  env2.g.save(s);
  menu2.create();
  const pips2 = menu2.children.list.filter((o) => o.type === 'circle' && o.radius === 6);
  assert.equal(pips2.filter((p) => p.fillColor === 0xffdd3c).length, 5, 'day 5 => five lit pips');
});

test('the leaderboard renders the top 10 in descending order', () => {
  const env = loadGame();
  const board = [];
  for (let i = 1; i <= 12; i++) board.push({ name: 'P' + i, score: i * 10 });
  env.seedSave({ leaderboard: board });

  const menu = openMenu(env);
  const rows = menu.children.list.filter((o) => o.type === 'text' && /^\d+\.\s/.test(o.text));

  assert.equal(rows.length, 10, 'only ten rows are shown');
  assert.equal(rows[0].text, '1. P12  —  120');
  assert.equal(rows[9].text, '10. P3  —  30');
  const scores = rows.map((r) => Number(r.text.split('—')[1]));
  assert.deepEqual(plain(scores), plain([...scores].sort((a, b) => b - a)));
});

test('an empty leaderboard shows the first-run prompt', () => {
  const env = loadGame();
  const menu = openMenu(env);
  assert.ok(hasText(menu, 'No runs yet'));
});

test('the menu still renders when localStorage is completely unavailable', () => {
  const { FakeStorage } = require('../harness');
  const storage = new FakeStorage();
  storage.throwOnGet = true;
  storage.throwOnSet = true;
  const env = loadGame({ storage });

  // The regression this guards: an uncaught SecurityError on the first line of
  // MenuScene.create() left a blank screen with nothing drawn.
  let menu;
  assert.doesNotThrow(() => { menu = openMenu(env); });
  assert.ok(hasText(menu, 'PULSE STREAK'));
  assert.ok(hasText(menu, 'PLAY'));
});
