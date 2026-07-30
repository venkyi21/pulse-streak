'use strict';
// Integration tests for the meadow background and the game-feel touches that
// come with it: parallax layer ordering and speeds, and the contact shadow.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame, tap, runFrame, runFrames, plain } = require('../harness');

function startGame(env, { seed } = {}) {
  if (seed) env.seedSave(seed);
  env.setRandom(() => 0.99);
  env.boot();
  const game = new env.g.GameScene();
  game.create();
  return game;
}

const layers = (game) => [game.hillFar, game.hillMid, game.hillNear, game.verge];

test('every scenery layer sits behind the gameplay layer', () => {
  const env = loadGame();
  const game = startGame(env);

  const scenery = game.children.list.filter(
    (o) => ['tileSprite', 'ellipse'].includes(o.type) ||
      (o.type === 'image' && ['sky', 'sun', 'cloud'].includes(o.texture))
  );
  assert.ok(scenery.length >= 8, `expected the full layer stack, saw ${scenery.length}`);
  for (const s of scenery) {
    assert.ok(s.depth < 0, `${s.type}/${s.texture || ''} at depth ${s.depth} would cover the player`);
  }
  assert.equal(game.player.depth, 0, 'the critter stays on the gameplay plane');
});

test('the layer stack is ordered back to front', () => {
  const env = loadGame();
  const game = startGame(env);

  const depthOf = (tex) => game.children.list.find((o) => o.texture === tex).depth;
  assert.ok(depthOf('sky') < depthOf('sun'));
  assert.ok(depthOf('sun') < depthOf('cloud'));
  assert.ok(depthOf('cloud') < game.hillFar.depth);
  assert.ok(game.hillFar.depth < game.hillMid.depth);
  assert.ok(game.hillMid.depth < game.hillNear.depth);
  assert.ok(game.hillNear.depth < game.verge.depth, 'the verge is the frontmost scenery');
  assert.ok(game.verge.depth < 0);
});

test('scenery never scrolls before the first tap', () => {
  const env = loadGame();
  const game = startGame(env);

  runFrames(game, 10);

  for (const l of layers(game)) assert.equal(l.tilePositionX, 0, 'the world holds still for the intro');
  assert.deepEqual(plain(game.clouds.map((c) => c.x)), [96, 310, 210]);
});

test('scenery scrolls once the run starts, slowest at the back', () => {
  const env = loadGame();
  const game = startGame(env);
  tap(game);

  runFrames(game, 20);

  const [far, mid, near, verge] = layers(game).map((l) => l.tilePositionX);
  assert.ok(far > 0, 'the far hills do move');
  assert.ok(far < mid, 'far hills lag the mid hills');
  assert.ok(mid < near, 'mid hills lag the near hills');
  assert.ok(near < verge, 'and the verge is fastest of all');
});

test('the verge scrolls at exactly the speed the storks travel', () => {
  const env = loadGame();
  const game = startGame(env);
  tap(game);
  game.spawnObstacle();
  const bird = game.obstacles.getChildren()[0];
  const x0 = bird.x;

  runFrames(game, 12, 16);

  const travelled = x0 - bird.x;
  assert.ok(Math.abs(travelled - game.verge.tilePositionX) < 0.001,
    `ground and obstacles must move together: bird ${travelled}, verge ${game.verge.tilePositionX}`);
});

test('the whole meadow speeds up with the streak multiplier', () => {
  const env = loadGame();
  const game = startGame(env);
  tap(game);

  runFrames(game, 10);
  const slow = game.verge.tilePositionX;

  game.speedMult = 1.6;
  const before = game.verge.tilePositionX;
  runFrames(game, 10);
  const fast = game.verge.tilePositionX - before;

  assert.ok(fast > slow * 1.5, `parallax should track difficulty: ${slow} then ${fast}`);
});

test('clouds drift and wrap around instead of running out', () => {
  const env = loadGame();
  const game = startGame(env);
  tap(game);
  const cloud = game.clouds[0];

  runFrames(game, 30);
  assert.ok(cloud.x < 96, 'clouds drift left');

  // long enough for every cloud to leave the screen several times over
  runFrames(game, 2000);
  for (const c of game.clouds) {
    assert.ok(c.x > -81 && c.x < env.g.W + 161, `cloud escaped to x=${c.x}`);
  }
});

test('the contact shadow sits under the critter from the very first frame', () => {
  const env = loadGame();
  const game = startGame(env);

  assert.ok(game.playerShadow, 'the shadow exists before any input');
  assert.equal(game.playerShadow.x, game.player.x);
  assert.ok(game.playerShadow.y > game.player.y, 'and below it');
  assert.ok(game.playerShadow.depth < 0, 'behind the critter, in front of the turf');

  runFrames(game, 6);
  assert.equal(game.playerShadow.x, game.player.x, 'it tracks without a tap');
});

test('the shadow shrinks and fades as the critter rises, then recovers', () => {
  const env = loadGame();
  const game = startGame(env);
  runFrames(game, 6);
  tap(game);

  const grounded = { scale: game.playerShadow.scaleX, alpha: game.playerShadow.alpha };
  let minScale = grounded.scale;
  let minAlpha = grounded.alpha;
  for (let i = 0; i < 20; i++) {
    runFrame(game, 16);
    minScale = Math.min(minScale, game.playerShadow.scaleX);
    minAlpha = Math.min(minAlpha, game.playerShadow.alpha);
  }
  assert.ok(minScale < grounded.scale - 0.1, 'it tightens as a height cue');
  assert.ok(minAlpha < grounded.alpha - 0.05, 'and softens');

  runFrames(game, 60);
  assert.ok(Math.abs(game.playerShadow.scaleX - grounded.scale) < 0.02,
    'and returns to full size on landing');
});

test('the shadow keeps up while the critter is knocked around', () => {
  const env = loadGame();
  const game = startGame(env);
  tap(game);

  game.player.setPosition(300, 400);
  runFrame(game, 16);
  assert.equal(game.playerShadow.x, 300);
});

test('a revive rebuilds the board without destroying the scenery', () => {
  const env = loadGame();
  const game = startGame(env);
  tap(game);
  game.endRun();

  game.reviveContinue();

  // The teardown in reviveContinue() removes everything at depth >= 80; the
  // scenery is all negative, so it has to survive.
  assert.ok(game.verge.active, 'the verge survives');
  assert.ok(game.hillFar.active && game.hillMid.active && game.hillNear.active);
  assert.ok(game.playerShadow.active, 'and so does the shadow');
  assert.ok(game.children.list.some((o) => o.texture === 'sky'));
});

test('the obstacle is the stork, and it still lands flush on the turf', () => {
  const env = loadGame();
  const game = startGame(env);
  tap(game);
  game.spawnObstacle();

  const bird = game.obstacles.getChildren()[0];
  assert.equal(bird.texture, 'stork');
  assert.equal(bird.body.width, 50, 'same hitbox as the spike it replaced');
  assert.equal(bird.body.height, 50);
  assert.equal(bird.bottom, env.g.GROUND_Y, 'feet on the ground line, not floating');
});

test('the scripted bot still clears storks at the same timing as spikes', () => {
  const env = loadGame();
  const game = startGame(env);
  tap(game);

  for (let i = 0; i < 600 && !game.gameOver; i++) {
    runFrame(game, 16);
    const near = game.obstacles.getChildren().find(
      (o) => o.active && o.x > game.player.x && o.x - game.player.x < 95
    );
    if (near) tap(game);
  }

  assert.equal(game.gameOver, false, 'the art swap must not change the jump window');
  assert.ok(game.score >= 5, `expected at least 5 clears, got ${game.score}`);
});
