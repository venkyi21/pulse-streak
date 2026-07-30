'use strict';
// Integration tests for GameScene: the intro, the jump, spawning, scoring,
// the streak escalation, shards, and the guard pulse — driven through the real
// input handlers and a simulated physics/frame loop.

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  loadGame, findText, hasText, tap, pressSpace, runFrame, runFrames, groundPlayer, plain
} = require('../harness');

const NO_LUCK = () => 0.99;   // suppresses the 50% shard spawn and the 20% gacha
const ALL_LUCK = () => 0.01;

function startGame(env, { seed, random = NO_LUCK } = {}) {
  if (seed) env.seedSave(seed);
  env.setRandom(random);
  env.boot();
  const game = new env.g.GameScene();
  game.create();
  return game;
}

/** Park an obstacle just short of the player and step one frame past it. */
function scrollPast(game, obstacle) {
  obstacle.x = game.player.x + 1;
  obstacle.y = -500;               // out of collision range: this tests scoring only
  obstacle.body.velocity.x = -260;
  runFrame(game, 16);
}

// ------------------------------------------------------------------ intro ---

test('the run opens with the three-second-rule intro and no obstacles moving', () => {
  const env = loadGame();
  const game = startGame(env);

  assert.ok(hasText(game, 'TAP TO JUMP'), 'the control is stated');
  assert.ok(hasText(game, 'Hop over the storks. Grab the shards.'), 'the goal is stated');
  assert.ok(game.children.list.some((o) => o.type === 'image' && o.texture === 'stork'),
    'and one obstacle is visible before the first tap');
  assert.equal(game.obstacleTimer.paused, true, 'nothing spawns until the player taps');
  assert.equal(game.score, 0);
  assert.equal(game.started, false);
});

test('the player stands on the ground from frame one without tapping', () => {
  const env = loadGame();
  const game = startGame(env);

  assert.equal(game.player.body.gravityY, 1700, 'gravity is on immediately');
  runFrames(game, 5);
  assert.equal(game.player.body.blocked.down || game.player.body.touching.down, true);
  assert.equal(game.player.y, env.g.GROUND_Y - 17, 'resting exactly on the ground line');
  assert.equal(game.gameOver, false, 'no surprise fall before the first tap');
});

test('the first tap clears the intro and starts the spawner', () => {
  const env = loadGame();
  const game = startGame(env);

  tap(game);

  assert.equal(game.started, true);
  assert.equal(game.obstacleTimer.paused, false);
  assert.equal(hasText(game, 'TAP TO JUMP'), false, 'the overlay is removed, not just hidden');
  assert.equal(hasText(game, 'Hop over the storks'), false);
});

test('the first tap leaves nothing of the intro on screen', () => {
  const env = loadGame();
  const game = startGame(env);
  const introSize = game.children.list.length;

  tap(game);

  // Regression: the demo bird was never destroyed, so it hung in mid-screen for
  // the whole run looking like an obstacle. Assert on the whole intro group,
  // not just the two text lines, so any future intro element is covered too.
  const demoBirds = game.children.list.filter(
    (o) => o.type === 'image' && o.texture === 'stork'
  );
  assert.deepEqual(plain(demoBirds), [], 'no leftover stork floating in the sky');
  assert.equal(game.children.list.length, introSize - 3, 'text, subtitle and bird all go');

  // and nothing decorative is left hanging above the ground other than scenery
  const floating = game.children.list.filter(
    (o) => o.depth === 0 && o.type === 'image' && o.y < env.g.GROUND_Y - 60
  );
  assert.deepEqual(plain(floating), []);
});

test('a retry rebuilds the intro cleanly rather than doubling it up', () => {
  const env = loadGame();
  const game = startGame(env);
  tap(game);
  assert.equal(game.children.list.filter((o) => o.texture === 'stork').length, 0);

  // create() runs again on scene.restart(); the fresh intro must be present and
  // singular.
  const again = new env.g.GameScene();
  again.create();
  assert.equal(again.children.list.filter(
    (o) => o.type === 'image' && o.texture === 'stork'
  ).length, 1);
  assert.ok(hasText(again, 'TAP TO JUMP'));
});

test('spacebar drives the same jump as a tap', () => {
  const env = loadGame();
  const game = startGame(env);
  groundPlayer(game);

  pressSpace(game);

  assert.equal(game.started, true);
  assert.equal(game.player.body.velocity.y, game.jumpVelocity);
});

// ------------------------------------------------------------------- jump ---

test('a grounded tap launches the player; an airborne tap does nothing', () => {
  const env = loadGame();
  const game = startGame(env);
  groundPlayer(game);

  tap(game);
  assert.equal(game.player.body.velocity.y, game.jumpVelocity);

  runFrames(game, 3);
  const midAir = game.player.body.velocity.y;
  tap(game);
  assert.equal(game.player.body.velocity.y, midAir,
    'no double jump / infinite hover — tap timing has to mean something');
});

test('the player lands again and can jump a second time', () => {
  const env = loadGame();
  const game = startGame(env);
  groundPlayer(game);
  tap(game);

  runFrames(game, 60);           // ~1s: up and back down
  assert.equal(game.player.body.blocked.down, true, 'back on the ground');
  tap(game);
  assert.equal(game.player.body.velocity.y, game.jumpVelocity);
});

test('the jump clears the full height of a spike', () => {
  const env = loadGame();
  const game = startGame(env);
  const spikeTop = env.g.GROUND_Y - 50;

  groundPlayer(game);
  tap(game);
  let highest = game.player.y;
  for (let i = 0; i < 60; i++) {
    runFrame(game, 16);
    highest = Math.min(highest, game.player.bottom);
  }
  assert.ok(highest < spikeTop,
    `the player's feet must clear ${spikeTop}, reached ${highest.toFixed(1)}`);
});

test('taps are ignored once the run is over', () => {
  const env = loadGame();
  const game = startGame(env);
  tap(game);
  game.endRun();

  const before = game.player.body.velocity.y;
  tap(game);
  pressSpace(game);
  assert.equal(game.player.body.velocity.y, before);
});

// --------------------------------------------------------------- spawning ---

test('a spawned spike rests on the ground line and ignores gravity', () => {
  const env = loadGame();
  const game = startGame(env);
  tap(game);

  game.spawnObstacle();
  const spike = game.obstacles.getChildren()[0];

  assert.equal(spike.body.allowGravity, false);
  assert.equal(spike.bottom, env.g.GROUND_Y, 'the spike sits flush on the ground, not floating');
  assert.equal(spike.x, env.g.W + 40, 'it enters from off-screen right');
  assert.equal(spike.body.velocity.x, game.baseSpeed, 'and scrolls left at the run speed');
  assert.equal(spike.scored, false);
});

test('the spawner fires on its 1300ms cadence once started', () => {
  const env = loadGame();
  const game = startGame(env);
  tap(game);

  game.__clock.advance(1299);
  assert.equal(game.obstacles.getChildren().length, 0);
  game.__clock.advance(1);
  assert.equal(game.obstacles.getChildren().length, 1);
  game.__clock.advance(1300 * 3);
  assert.equal(game.obstacles.getChildren().length, 4, 'and keeps looping');
});

test('off-screen spikes are cleaned up after six seconds', () => {
  const env = loadGame();
  const game = startGame(env);
  tap(game);
  game.obstacleTimer.paused = true;   // isolate the cleanup timer from the spawner
  game.spawnObstacle();

  game.__clock.advance(5999);
  assert.equal(game.obstacles.getChildren().length, 1);
  game.__clock.advance(1);
  assert.equal(game.obstacles.getChildren().length, 0, 'no unbounded growth over a long run');
});

test('shards spawn about half the time, above the ground, and drift with the spikes', () => {
  const env = loadGame();
  const game = startGame(env, { random: ALL_LUCK });
  tap(game);

  game.spawnObstacle();
  const shard = game.shards.getChildren()[0];
  assert.ok(shard, 'a lucky roll spawns a shard');
  assert.equal(shard.body.allowGravity, false);
  assert.equal(shard.body.velocity.x, game.baseSpeed);
  assert.ok(shard.y <= env.g.GROUND_Y - 70, 'shards hover in jump range, not on the floor');
  assert.ok(shard.y >= env.g.GROUND_Y - 130);

  const unlucky = startGame(loadGame(), { random: NO_LUCK });
  tap(unlucky);
  unlucky.spawnObstacle();
  assert.equal(unlucky.shards.getChildren().length, 0, 'an unlucky roll spawns none');
});

test('the shard magnet upgrade widens the pickup body', () => {
  const plainEnv = loadGame();
  const noMagnet = startGame(plainEnv, { random: ALL_LUCK });
  tap(noMagnet);
  noMagnet.spawnObstacle();
  const bare = noMagnet.shards.getChildren()[0];
  assert.equal(bare.body.isCircle, false, 'level 0 keeps the plain texture body');

  const env = loadGame();
  const game = startGame(env, {
    seed: { upgrades: { jump: 0, magnet: 3, guard: 0 } }, random: ALL_LUCK
  });
  tap(game);
  game.spawnObstacle();
  const magnetised = game.shards.getChildren()[0];
  assert.equal(magnetised.body.isCircle, true);
  assert.equal(magnetised.body.radius, 9 + 3 * 7, 'radius grows 7px per level');
  assert.ok(magnetised.body.width > bare.body.width);
});

// ---------------------------------------------------------------- scoring ---

test('clearing a spike scores exactly once', () => {
  const env = loadGame();
  const game = startGame(env);
  tap(game);
  game.spawnObstacle();
  const spike = game.obstacles.getChildren()[0];

  scrollPast(game, spike);
  assert.equal(game.score, 1);
  assert.equal(game.streak, 1);
  assert.equal(game.scoreText.text, '1');

  runFrames(game, 5);
  assert.equal(game.score, 1, 'the same spike must not keep scoring every frame');
  assert.equal(spike.scored, true);
});

test('the score does not move while the intro is still up', () => {
  const env = loadGame();
  const game = startGame(env);
  game.spawnObstacle();                      // manual spawn, no tap yet
  const spike = game.obstacles.getChildren()[0];
  spike.x = game.player.x - 10;

  runFrames(game, 3);
  assert.equal(game.score, 0, 'update() is inert before the first tap');
});

test('every fifth clear escalates speed and fires the streak feedback', () => {
  const env = loadGame();
  const game = startGame(env);
  tap(game);

  for (let i = 0; i < 4; i++) {
    game.spawnObstacle();
    scrollPast(game, game.obstacles.getChildren().at(-1));
  }
  assert.equal(game.speedMult, 1, 'no bump before the fifth');
  assert.equal(game.streakText.text, 'streak 4');
  const flashesBefore = game.__flashes.length;

  game.spawnObstacle();
  scrollPast(game, game.obstacles.getChildren().at(-1));

  assert.equal(game.score, 5);
  assert.equal(Number(game.speedMult.toFixed(2)), 1.08, 'speed steps up 8%');
  assert.ok(game.__flashes.length > flashesBefore, 'the screen flashes on the milestone');
  assert.match(game.streakText.text, /STREAK x5!\s+speed 1\.08x/);
});

test('the speed multiplier is capped at 1.6x', () => {
  const env = loadGame();
  const game = startGame(env);
  tap(game);

  for (let i = 0; i < 60; i++) {
    game.spawnObstacle();
    scrollPast(game, game.obstacles.getChildren().at(-1));
  }
  assert.equal(game.score, 60);
  assert.equal(game.speedMult, 1.6, 'difficulty plateaus instead of running away');
});

test('later spikes inherit the escalated speed', () => {
  const env = loadGame();
  const game = startGame(env);
  tap(game);

  for (let i = 0; i < 5; i++) {
    game.spawnObstacle();
    scrollPast(game, game.obstacles.getChildren().at(-1));
  }
  game.spawnObstacle();
  const fast = game.obstacles.getChildren().at(-1);
  assert.equal(Math.round(fast.body.velocity.x), Math.round(game.baseSpeed * 1.08));
});

test('collecting a shard banks currency and destroys the pickup', () => {
  const env = loadGame();
  const game = startGame(env, { random: ALL_LUCK });
  tap(game);
  game.spawnObstacle();
  const shard = game.shards.getChildren()[0];

  // drop it onto the player and let the overlap fire
  shard.x = game.player.x;
  shard.y = game.player.y;
  shard.body.velocity.x = 0;
  runFrame(game, 16);

  assert.equal(game.shardsThisRun, 3, 'each shard is worth 3');
  assert.equal(shard.active, false);
  assert.equal(game.shards.getChildren().length, 0, 'and it leaves the group');
  assert.ok(game.__emitted.length > 0, 'with a particle burst as feedback');
});

// ------------------------------------------------------------ guard pulse ---

test('the guard pulse absorbs one hit and clears the spikes on top of the player', () => {
  const env = loadGame();
  const game = startGame(env, { seed: { upgrades: { jump: 0, magnet: 0, guard: 1 } } });
  tap(game);
  assert.equal(game.hasGuard, true);

  // three spikes bunched around the player, all inside the 70px clear radius
  for (let i = 0; i < 3; i++) game.spawnObstacle();
  game.obstacles.getChildren().forEach((o, i) => { o.x = game.player.x + i * 20; });

  game.onHit();

  assert.equal(game.gameOver, false, 'the run continues');
  assert.equal(game.hasGuard, false, 'the shield is spent');
  assert.equal(game.obstacles.getChildren().length, 0,
    'every spike within the clear radius is removed, so the player is not re-killed');
  assert.ok(game.__flashes.length > 0);
});

test('the guard only clears nearby spikes, not the whole board', () => {
  const env = loadGame();
  const game = startGame(env, { seed: { upgrades: { jump: 0, magnet: 0, guard: 1 } } });
  tap(game);

  for (let i = 0; i < 2; i++) game.spawnObstacle();
  const [near, far] = game.obstacles.getChildren();
  near.x = game.player.x + 10;
  far.x = game.player.x + 300;

  game.onHit();

  assert.deepEqual(plain(game.obstacles.getChildren().map((o) => o.x)), [far.x],
    'the spike still approaching is left in play');
});

test('the second hit of a run ends it even with the guard upgrade', () => {
  const env = loadGame();
  const game = startGame(env, { seed: { upgrades: { jump: 0, magnet: 0, guard: 5 } } });
  tap(game);

  game.onHit();
  assert.equal(game.gameOver, false);
  game.onHit();
  assert.equal(game.gameOver, true, 'guard grants one shield per run, not one per level');
});

test('without the upgrade the first hit ends the run', () => {
  const env = loadGame();
  const game = startGame(env);
  tap(game);
  assert.equal(game.hasGuard, false);

  game.onHit();
  assert.equal(game.gameOver, true);
});

test('running into a spike really does end the run (full physics path)', () => {
  const env = loadGame();
  const game = startGame(env);
  tap(game);
  game.spawnObstacle();

  for (let i = 0; i < 200 && !game.gameOver; i++) runFrame(game, 16);

  assert.equal(game.gameOver, true, 'a player who never jumps collides with the spike');
  assert.ok(hasText(game, 'RUN OVER'));
});

test('a scripted player who jumps in time survives and racks up a streak', () => {
  const env = loadGame();
  const game = startGame(env);
  tap(game);

  // Simple bot: jump when the nearest spike is within ~95px.
  for (let i = 0; i < 600 && !game.gameOver; i++) {
    runFrame(game, 16);
    const near = game.obstacles.getChildren().find(
      (o) => o.active && o.x > game.player.x && o.x - game.player.x < 95
    );
    if (near) tap(game);
  }

  assert.equal(game.gameOver, false, 'the jump window is wide enough to be playable');
  assert.ok(game.score >= 5, `expected at least 5 clears in ~10s, got ${game.score}`);
  assert.equal(game.score, game.streak, 'an unbroken run keeps score and streak in step');
  assert.ok(game.speedMult > 1, 'and difficulty ramped along the way');
});

test('the off-screen safety net ends a run if the player falls out of the world', () => {
  const env = loadGame();
  const game = startGame(env);
  tap(game);

  game.player.y = env.g.H + 100;
  game.update();

  assert.equal(game.gameOver, true);
});

test('known gap: collected-or-not, shards are never swept off-screen', () => {
  const env = loadGame();
  const game = startGame(env, { random: ALL_LUCK });
  tap(game);

  // Spikes get a 6s cleanup timer; shards do not, so uncollected ones live on
  // as off-screen bodies for the whole run. Harmless at these counts, but
  // recorded so the asymmetry is a decision rather than an oversight.
  game.obstacleTimer.paused = true;
  for (let i = 0; i < 5; i++) game.spawnObstacle();
  game.__clock.advance(10000);

  assert.equal(game.obstacles.getChildren().length, 0, 'spikes are reaped');
  assert.equal(game.shards.getChildren().length, 5, 'shards are not');
});
