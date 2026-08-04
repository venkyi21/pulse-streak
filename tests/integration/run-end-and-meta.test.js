'use strict';
// Integration tests for everything that happens after a run ends: the payout,
// the cosmetic gacha, the game-over panel, the simulated revive ad, and the
// local leaderboard.

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  loadGame, findText, hasText, tap, clickButton, runFrame, runFrames, plain
} = require('../harness');

const NO_LUCK = () => 0.99;
const ALL_LUCK = () => 0.01;

function startGame(env, { seed, random = NO_LUCK } = {}) {
  if (seed) env.seedSave(seed);
  env.setRandom(random);
  env.boot();
  const game = new env.g.GameScene();
  game.create();
  tap(game);
  game.obstacleTimer.paused = true;   // deterministic: spawn on demand
  return game;
}

/** Finish a run with a known score and shard haul. */
function finishRun(game, { score = 0, shards = 0 } = {}) {
  game.score = score;
  game.shardsThisRun = shards;
  game.endRun();
  return game;
}

// ----------------------------------------------------------------- payout ---

test('ending a run freezes the world and stops the spawner', () => {
  const env = loadGame();
  const game = startGame(env);
  game.obstacleTimer.paused = false;

  finishRun(game, { score: 7 });

  assert.equal(game.gameOver, true);
  assert.equal(game.__physicsPaused, true);
  assert.equal(game.obstacleTimer.paused, true);
  assert.ok(game.__shakes.length > 0, 'the camera shake sells the crash');
});

test('the run banks its shards and raises the best score', () => {
  const env = loadGame();
  const game = startGame(env, { seed: { shards: 40, best: 3 } });

  finishRun(game, { score: 11, shards: 9 });

  const s = env.readSave();
  assert.equal(s.shards, 49, 'the haul is added to the bank');
  assert.equal(s.best, 11);
});

test('a worse run never lowers the best score', () => {
  const env = loadGame();
  const game = startGame(env, { seed: { best: 50 } });

  finishRun(game, { score: 4, shards: 2 });

  const s = env.readSave();
  assert.equal(s.best, 50);
  assert.equal(s.shards, 2, 'but the shards still count');
});

test('a tying run leaves the best score alone', () => {
  const env = loadGame();
  const game = startGame(env, { seed: { best: 20 } });
  finishRun(game, { score: 20 });
  assert.equal(env.readSave().best, 20);
});

test('shards accumulate across consecutive runs', () => {
  const env = loadGame();
  const g1 = startGame(env);
  finishRun(g1, { score: 2, shards: 6 });

  const g2 = startGame(env);
  finishRun(g2, { score: 5, shards: 9 });

  const s = env.readSave();
  assert.equal(s.shards, 15);
  assert.equal(s.best, 5);
});

// ------------------------------------------------------------------ gacha ---

test('a lucky run unlocks one new trail colour and announces it', () => {
  const env = loadGame();
  const game = startGame(env, { random: ALL_LUCK });   // 0.01 < 0.20

  finishRun(game, { score: 3 });

  const s = env.readSave();
  assert.equal(s.trails.length, 2);
  assert.ok(env.g.TRAIL_POOL.includes(s.trails[1]), 'the unlock comes from the palette');
  assert.equal(s.equipped, '0x37e6ff', 'an unlock does not silently re-equip');
  assert.ok(hasText(game, 'New trail color unlocked!'));
});

test('an unlucky run unlocks nothing', () => {
  const env = loadGame();
  const game = startGame(env, { random: NO_LUCK });    // 0.99 >= 0.20

  finishRun(game, { score: 3 });

  assert.equal(env.readSave().trails.length, 1);
  assert.equal(hasText(game, 'New trail color unlocked!'), false);
});

test('a player who owns every colour rolls nothing and does not corrupt the list', () => {
  const env = loadGame();
  const game = startGame(env, {
    seed: { trails: [...loadGame().g.TRAIL_POOL] }, random: ALL_LUCK
  });

  finishRun(game, { score: 3 });

  const s = env.readSave();
  assert.equal(s.trails.length, env.g.TRAIL_POOL.length);
  assert.equal(new Set(s.trails).size, s.trails.length, 'no duplicate unlocks');
  assert.equal(hasText(game, 'New trail color unlocked!'), false);
});

test('unlocks never duplicate an already-owned colour', () => {
  const env = loadGame();
  const owned = env.g.TRAIL_POOL.slice(0, 5);
  const game = startGame(env, { seed: { trails: owned }, random: ALL_LUCK });

  finishRun(game, { score: 1 });

  const s = env.readSave();
  assert.equal(s.trails.length, 6);
  assert.equal(new Set(s.trails).size, 6);
});

// -------------------------------------------------------- game over panel ---

test('the game-over panel reports the run and offers all three exits', () => {
  const env = loadGame();
  const game = startGame(env, { seed: { best: 30 } });

  finishRun(game, { score: 12, shards: 8 });

  assert.ok(hasText(game, 'RUN OVER'));
  assert.ok(hasText(game, 'Score: 12'));
  assert.ok(hasText(game, 'Best: 30'));
  assert.ok(hasText(game, 'Shards earned: +8'));
  assert.ok(hasText(game, 'CONTINUE (free)'));
  assert.ok(hasText(game, 'RETRY (instant)'));
  assert.ok(hasText(game, 'MENU'));
});

test('RETRY restarts the scene immediately — zero-friction, no menu detour', () => {
  const env = loadGame();
  const game = startGame(env);
  finishRun(game, { score: 4 });

  clickButton(game, 'RETRY (instant)');

  assert.equal(game.__restarts, 1);
  assert.deepEqual(plain(game.__sceneStarts.map((s) => s.key)), ['__restart'],
    'it never routes through the Menu scene');
});

// ------------------------------------------------------------ revive / ad ---

test('the free continue resumes the run immediately, with no fake ad', () => {
  const env = loadGame();
  const game = startGame(env);
  finishRun(game, { score: 6 });

  clickButton(game, 'CONTINUE (free)');

  assert.equal(game.gameOver, false, 'no countdown to sit through');
  assert.equal(hasText(game, 'Simulated'), false);
  assert.equal(hasText(game, 'Rewarded Ad'), false);
  assert.equal(typeof game.showAdRevive, 'undefined', 'the ad flow is removed outright');
});

test('reviving resumes physics, resets the player, and grants a grace shield', () => {
  const env = loadGame();
  const game = startGame(env);
  finishRun(game, { score: 6 });
  game.player.setPosition(300, 100);

  game.reviveContinue();

  assert.equal(game.gameOver, false);
  assert.equal(game.__physicsPaused, false);
  assert.equal(game.obstacleTimer.paused, false, 'obstacles start coming again');
  assert.equal(game.player.x, env.g.W * 0.24, 'the player is back at the running lane');
  assert.equal(game.player.y, env.g.GROUND_Y - 20);
  assert.equal(game.player.body.velocity.y, 0);
  assert.equal(game.hasGuard, true, 'one grace hit after paying attention to an ad');
});

test('reviving keeps the score and the shards already earned', () => {
  const env = loadGame();
  const game = startGame(env);
  finishRun(game, { score: 9, shards: 12 });

  game.reviveContinue();

  assert.equal(game.score, 9, 'a continue is a continue, not a restart');
  assert.equal(game.shardsThisRun, 12);
});

test('reviving clears every spike and shard from the board', () => {
  const env = loadGame();
  const game = startGame(env, { random: ALL_LUCK });
  for (let i = 0; i < 5; i++) game.spawnObstacle();
  assert.equal(game.obstacles.getChildren().length, 5);
  assert.equal(game.shards.getChildren().length, 5);

  finishRun(game, { score: 5 });
  game.reviveContinue();

  // Regression: destroying inside Group.children.iterate() skipped every other
  // member, leaving spikes sitting on top of the just-revived player.
  assert.equal(game.obstacles.getChildren().length, 0, 'no spikes survive the revive');
  assert.equal(game.shards.getChildren().length, 0);
});

test('a revived player is not instantly killed by leftover geometry', () => {
  const env = loadGame();
  const game = startGame(env);
  for (let i = 0; i < 4; i++) game.spawnObstacle();
  // bunch them where the player respawns
  game.obstacles.getChildren().forEach((o, i) => { o.x = env.g.W * 0.24 + i * 12; });

  finishRun(game, { score: 5 });
  game.reviveContinue();
  runFrames(game, 5);

  assert.equal(game.gameOver, false, 'the revive must actually give the player a clean board');
  assert.equal(game.hasGuard, true, 'and the grace shield is still unspent');
});

test('the game-over panel is torn down by a revive', () => {
  const env = loadGame();
  const game = startGame(env);
  finishRun(game, { score: 5 });
  assert.ok(hasText(game, 'RUN OVER'));

  game.reviveContinue();

  assert.equal(hasText(game, 'RUN OVER'), false);
  assert.equal(hasText(game, 'RETRY (instant)'), false);
  assert.equal(game.children.list.filter((o) => o.depth >= 80).length, 0);
});

test('the revive is offered once per run', () => {
  const env = loadGame();
  const game = startGame(env);
  finishRun(game, { score: 5 });
  clickButton(game, 'CONTINUE (free)');

  finishRun(game, { score: 8 });

  assert.equal(hasText(game, 'CONTINUE (free)'), false, 'no infinite continues');
  assert.ok(hasText(game, 'RETRY (instant)'), 'but retry is always there');
});

test('a revived run can still be scored and ended normally', () => {
  const env = loadGame();
  const game = startGame(env);
  finishRun(game, { score: 3 });
  game.reviveContinue();

  game.spawnObstacle();
  const spike = game.obstacles.getChildren()[0];
  spike.x = game.player.x + 1;
  spike.y = -500;
  runFrame(game, 16);
  assert.equal(game.score, 4, 'scoring resumes from where it left off');

  game.onHit();                       // spends the grace shield
  assert.equal(game.gameOver, false);
  game.onHit();
  assert.equal(game.gameOver, true);
});

// ------------------------------------------------------------ leaderboard ---

test('a qualifying score prompts for initials before the menu', () => {
  const env = loadGame();
  const game = startGame(env);
  finishRun(game, { score: 15 });

  clickButton(game, 'MENU');

  assert.ok(hasText(game, 'New Leaderboard Entry!'));
  assert.ok(hasText(game, 'Score: 15'));
  assert.deepEqual(plain(game.__sceneStarts), [], 'the menu waits for the entry');
  assert.ok(env.elements.get('initials'), 'the initials input is mounted');
  assert.equal(env.elements.get('initials').maxLength, 3);
});

test('saving initials writes the entry, sorted and capped at ten', () => {
  const env = loadGame();
  const board = [];
  for (let i = 1; i <= 10; i++) board.push({ name: 'P' + i, score: i });
  const game = startGame(env, { seed: { leaderboard: board } });
  finishRun(game, { score: 500 });

  clickButton(game, 'MENU');
  env.elements.get('initials').value = 'abc';
  clickButton(game, 'SAVE');

  const s = env.readSave();
  assert.equal(s.leaderboard.length, 10, 'the board stays capped at ten');
  assert.deepEqual(plain(s.leaderboard[0]), { name: 'ABC', score: 500 },
    'the new entry lands on top, upper-cased');
  assert.equal(s.leaderboard.some((r) => r.score === 1), false, 'the worst entry is pushed off');
  assert.deepEqual(plain(game.__sceneStarts.map((e) => e.key)), ['Menu']);
});

test('initials are trimmed to three characters and fall back to YOU when blank', () => {
  const env = loadGame();
  const game = startGame(env);
  finishRun(game, { score: 5 });
  clickButton(game, 'MENU');
  env.elements.get('initials').value = 'toolong';
  clickButton(game, 'SAVE');
  assert.equal(env.readSave().leaderboard[0].name, 'TOO');

  const env2 = loadGame();
  const game2 = startGame(env2);
  finishRun(game2, { score: 5 });
  clickButton(game2, 'MENU');
  env2.elements.get('initials').value = '';
  clickButton(game2, 'SAVE');
  assert.equal(env2.readSave().leaderboard[0].name, 'YOU');
});

test('a score too low for a full board goes straight to the menu', () => {
  const env = loadGame();
  const board = [];
  for (let i = 1; i <= 10; i++) board.push({ name: 'P' + i, score: 100 + i });
  const game = startGame(env, { seed: { leaderboard: board } });
  finishRun(game, { score: 7 });

  clickButton(game, 'MENU');

  assert.equal(hasText(game, 'New Leaderboard Entry!'), false);
  assert.deepEqual(plain(game.__sceneStarts.map((e) => e.key)), ['Menu']);
  assert.equal(env.readSave().leaderboard.length, 10, 'the board is untouched');
});

test('a zero score never reaches the leaderboard', () => {
  const env = loadGame();
  const game = startGame(env);
  finishRun(game, { score: 0 });

  clickButton(game, 'MENU');

  assert.equal(hasText(game, 'New Leaderboard Entry!'), false);
  assert.deepEqual(plain(game.__sceneStarts.map((e) => e.key)), ['Menu']);
  assert.equal(env.readSave().leaderboard.length, 0);
});

test('an empty board accepts the first score', () => {
  const env = loadGame();
  const game = startGame(env);
  finishRun(game, { score: 1 });

  clickButton(game, 'MENU');

  assert.ok(hasText(game, 'New Leaderboard Entry!'), 'any score beats an empty board');
});

test('a full run round-trips into the menu: shards spend, best score shows', () => {
  const env = loadGame();
  const game = startGame(env);
  finishRun(game, { score: 21, shards: 30 });
  clickButton(game, 'MENU');
  env.elements.get('initials').value = 'ZZZ';
  clickButton(game, 'SAVE');

  const menu = new env.g.MenuScene();
  menu.create();

  assert.ok(hasText(menu, '◆ 30'), 'the run payout is spendable in the shop');
  assert.ok(hasText(menu, 'Best 21'));
  assert.ok(hasText(menu, '1. ZZZ  21'), 'and the entry shows on the board');
});
