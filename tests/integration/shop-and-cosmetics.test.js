'use strict';
// Integration tests for the meta-progression economy: the shop panel and the
// trail-colour cosmetics, driven through the real pointer handlers.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame, findText, findTexts, hasText, clickButton, plain } = require('../harness');

function openMenu(env) {
  env.boot();
  const menu = new env.g.MenuScene();
  menu.create();
  return menu;
}

/** Open the shop and return { menu, buy(label) }. */
function openShop(env) {
  const menu = openMenu(env);
  clickButton(menu, 'SHOP / UPGRADES');
  return menu;
}

/** Click the "Buy N" button that sits on the row whose label matches. */
function buyRow(menu, rowLabel) {
  const row = findTexts(menu, rowLabel)[0];
  if (!row) throw new Error(`no shop row matching "${rowLabel}"`);
  const buttons = menu.children.list.filter(
    (o) => o.interactive && o.type === 'rectangle' && Math.abs(o.y - (row.y + 8)) < 2
  );
  assert.equal(buttons.length, 1, `expected one buy button on the "${rowLabel}" row`);
  buttons[0].emit('pointerdown');
}

test('the shop lists all three upgrades with level and price', () => {
  const env = loadGame();
  env.seedSave({ shards: 100 });
  const menu = openShop(env);

  assert.ok(hasText(menu, 'SHOP'));
  assert.ok(hasText(menu, 'Shards: 100'));
  assert.ok(hasText(menu, 'Jump Boost (higher clear)  Lv.0'));
  assert.ok(hasText(menu, 'Shard Magnet (+radius)  Lv.0'));
  assert.ok(hasText(menu, 'Guard Pulse (block 1 hit)  Lv.0'));
  assert.ok(hasText(menu, 'Buy 25'), 'jump costs 25 at level 0');
  assert.ok(hasText(menu, 'Buy 22'), 'magnet costs 22 at level 0');
  assert.ok(hasText(menu, 'Buy 35'), 'guard costs 35 at level 0');
});

test('buying an upgrade deducts shards, raises the level, and repaints the panel', () => {
  const env = loadGame();
  env.seedSave({ shards: 100 });
  const menu = openShop(env);

  buyRow(menu, 'Jump Boost');

  const s = env.readSave();
  assert.equal(s.upgrades.jump, 1);
  assert.equal(s.shards, 75);
  assert.ok(hasText(menu, 'Jump Boost (higher clear)  Lv.1'), 'the row re-renders');
  assert.ok(hasText(menu, 'Shards: 75'));
  assert.ok(hasText(menu, 'Buy 50'), 'the next level costs base x (level+1)');
});

test('the price ladder is base x (level+1) all the way to max', () => {
  const env = loadGame();
  env.seedSave({ shards: 1000 });
  const menu = openShop(env);

  const expected = [25, 50, 75, 100, 125];
  let spent = 0;
  for (const price of expected) {
    assert.ok(hasText(menu, `Buy ${price}`), `level up should cost ${price}`);
    buyRow(menu, 'Jump Boost');
    spent += price;
  }
  const s = env.readSave();
  assert.equal(s.upgrades.jump, 5);
  assert.equal(s.shards, 1000 - spent);
  assert.equal(spent, 375, 'a full jump ladder costs 375 shards');
});

test('an unaffordable purchase changes nothing and explains why', () => {
  const env = loadGame();
  env.seedSave({ shards: 24 });
  const menu = openShop(env);

  buyRow(menu, 'Jump Boost');

  const s = env.readSave();
  assert.equal(s.shards, 24, 'shards untouched');
  assert.equal(s.upgrades.jump, 0, 'no free level');
  assert.ok(hasText(menu, 'Not enough shards'));
});

test('an exactly-affordable purchase succeeds (no off-by-one on the price check)', () => {
  const env = loadGame();
  env.seedSave({ shards: 25 });
  const menu = openShop(env);

  buyRow(menu, 'Jump Boost');

  assert.equal(env.readSave().shards, 0);
  assert.equal(env.readSave().upgrades.jump, 1);
});

test('upgrades are capped at level 5 and a maxed row refuses to charge', () => {
  const env = loadGame();
  env.seedSave({ shards: 9999, upgrades: { jump: 5, magnet: 0, guard: 0 } });
  const menu = openShop(env);

  buyRow(menu, 'Jump Boost');

  const s = env.readSave();
  assert.equal(s.upgrades.jump, 5);
  assert.equal(s.shards, 9999, 'a maxed upgrade must not consume shards');
  assert.ok(hasText(menu, 'Max level'));
});

test('the three upgrade tracks are independent', () => {
  const env = loadGame();
  env.seedSave({ shards: 500 });
  const menu = openShop(env);

  buyRow(menu, 'Shard Magnet');
  buyRow(menu, 'Guard Pulse');

  const s = env.readSave();
  assert.deepEqual(plain(s.upgrades), { jump: 0, magnet: 1, guard: 1 });
  assert.equal(s.shards, 500 - 22 - 35);
});

test('closing the shop tears the panel down and refreshes the menu', () => {
  const env = loadGame();
  env.seedSave({ shards: 100 });
  const menu = openShop(env);
  assert.ok(hasText(menu, 'SHOP'));

  clickButton(menu, '✕');

  assert.equal(hasText(menu, 'Buy 25'), false, 'no orphaned buy buttons left behind');
  assert.equal(menu.__restarts, 1, 'the menu reloads so the new shard total shows');
});

test('only owned trail colours are equippable; locked ones show a padlock', () => {
  const env = loadGame();
  const menu = openMenu(env);

  const swatches = menu.children.list.filter((o) => o.type === 'circle' && o.radius === 22);
  assert.equal(swatches.length, env.g.TRAIL_POOL.length, 'one swatch per pool colour');
  assert.equal(swatches.filter((c) => c.interactive).length, 1, 'only the default is owned');
  assert.equal(findTexts(menu, '🔒').length, env.g.TRAIL_POOL.length - 1);
});

test('tapping an owned trail equips it and persists the choice', () => {
  const env = loadGame();
  env.seedSave({ trails: ['0x37e6ff', '0xffdd3c'], equipped: '0x37e6ff' });
  const menu = openMenu(env);

  const swatches = menu.children.list.filter((o) => o.type === 'circle' && o.radius === 22);
  const owned = swatches.filter((c) => c.interactive);
  assert.equal(owned.length, 2);

  owned[1].emit('pointerdown');

  assert.equal(env.readSave().equipped, '0xffdd3c');
  assert.equal(menu.__restarts, 1);
});

test('the equipped swatch is the one with the highlighted outline', () => {
  const env = loadGame();
  env.seedSave({ trails: ['0x37e6ff', '0xffdd3c'], equipped: '0xffdd3c' });
  const menu = openMenu(env);

  const highlighted = menu.children.list.filter(
    // Inverted for the light menu: equipped gets the dark ring, the rest white.
    (o) => o.type === 'circle' && o.radius === 22 && o.strokeColor === 0x123a4a
  );
  assert.equal(highlighted.length, 1);
  assert.equal(highlighted[0].fillColor, parseInt('0xffdd3c', 16));
});

test('the equipped colour drives the particle trail in the next run', () => {
  const env = loadGame();
  env.seedSave({ trails: ['0x37e6ff', '0x6bff8f'], equipped: '0x6bff8f' });
  env.boot();

  const game = new env.g.GameScene();
  game.create();

  assert.equal(game.particles.config.tint, parseInt('0x6bff8f', 16));
});

test('the critter keeps its own colours regardless of the equipped cosmetic', () => {
  const env = loadGame();
  env.seedSave({ trails: ['0x37e6ff', '0xff4d9d'], equipped: '0xff4d9d' });
  env.boot();

  const game = new env.g.GameScene();
  game.create();

  // Tinting the sprite would recolour the eyes, blush and paws along with the
  // fur, which is what the hot-pink cosmetic used to do.
  assert.equal(game.player.tint, null, 'the player sprite is never tinted');
});

test('purchased upgrade levels reach the run that follows', () => {
  const env = loadGame();
  env.seedSave({ shards: 200, upgrades: { jump: 3, magnet: 2, guard: 1 } });
  env.boot();

  const game = new env.g.GameScene();
  game.create();

  assert.equal(game.jumpLevel, 3);
  assert.equal(game.magnetLevel, 2);
  assert.equal(game.hasGuard, true, 'any guard level grants one shield per run');
  assert.equal(game.jumpVelocity, -560 - 3 * 18, 'jump boost raises the launch velocity');
});
