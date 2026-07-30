# Pulse Streak

One-tap endless runner built on Phaser 3 (MIT license, vendored locally as `phaser.min.js` — no CDN, no other dependencies). All art is generated procedurally at runtime; there are no image or audio asset files.

## How to run it

Just double-click `index.html` — the only external reference is the local `phaser.min.js` file sitting next to it, loaded via a plain `<script>` tag, so it works straight from `file://` with no server needed. It was also verified over `http://localhost` during the build.

## Controls

Tap/click anywhere (or press Space) to hop over the crested storks. Grab the blue shards for currency.

## Art direction

Kid-facing look benchmarked against Lingokids: saturated primaries, chunky rounded forms, high-key
lighting, no thin detail that dies at small sizes. Everything is still generated procedurally at
runtime — there are no image files.

- **Runner** — a round fluffy critter (34×34): oversized eyes, blush, tiny paws, and a dark rim plus a
  contact shadow so it keeps a hard silhouette against a bright sky.
- **Obstacle** — a crested stork with its wings thrown open (50×50, the exact size of the pink spike it
  replaced, so jump timing and collision are unchanged). Black is the reserved hazard colour: no
  background element may use it, which is what the old pink spike lost next to pink flowers.
- **Background** — a five-deep parallax meadow: gradient sky, haloed sun, drifting clouds, three
  scrolling hill bands, and a flower verge running at full track speed. The verge is deliberately
  low-growing; taller flowers reach stork height and clutter the exact band the player reads for
  hazards.
- **HUD** — dark text with a white outline. White-on-white stopped being legible the moment the
  background turned bright.

The sky gradient is painted as 96 strips rather than with `fillGradientStyle`, which is WebGL-only —
strips look identical and survive a Canvas fallback. Hill and verge textures are exactly one screen
wide with their features repeating on a 96px pitch, so they tile without a seam.

Note the **menu is still on the original dark neon theme** — only the in-game scene was re-skinned.

## What's real vs. simulated

| Feature | Status |
|---|---|
| Core game (jump, physics, scoring, streaks) | Real |
| Shop / upgrades (Jump Boost, Shard Magnet, Guard Pulse) | Real, persisted in `localStorage` |
| Cosmetic trail-color unlocks | Real, persisted locally. The equipped color tints the **particle trail**, not the character — the critter keeps its own fur/eye/blush colors. |
| Local Top-10 leaderboard | Real, but **local only** — it lives in your browser's `localStorage`, not a shared/global backend. Making it cross-device would need a small server (e.g. a REST endpoint + database) to store scores. |
| Energy bar / "watch an ad for +1 energy" | **Simulated.** The countdown stands in for a rewarded-video ad. Making it real requires signing up with an ad network (AdMob, Unity Ads, etc.) and integrating its SDK. |
| "Revive (watch ad)" continue | **Simulated** the same way — same integration path to make it real. |
| Daily login streak bonus | Real logic (checks the date, tracks consecutive days), but since there's no account system, it's tied to one browser's local storage rather than a real user account. |

## Tests

```
npm test               # everything (135 tests)
npm run test:unit      # pure logic + shipped-artifact contract
npm run test:integration
npm run check          # index.html parses, evaluates and boots
```

No dependencies to install — it's Node's built-in test runner (`node:test`, Node 20+).

The game ships as one HTML file with an inline `<script>` and no module system, so
there is nothing to `import`. Rather than keep a duplicate copy of the logic,
[tests/harness.js](tests/harness.js) reads `index.html`, extracts the inline script
**verbatim**, and evaluates it in a fresh `vm` context against a fake Phaser, a fake
`localStorage` and a fake DOM. The tests therefore run the code that ships.

The fakes are faithful where fidelity changes behaviour:

- `Group.children.iterate()` caches its length up front and walks the live array, and
  destroying a member splices it out of the group — matching Phaser's `Structs.Set`, so
  destroy-while-iterating bugs are visible instead of smoothed over.
- Generated textures remember their width/height, so bodies get real sizes and overlap
  tests mean something.
- `runFrame()` applies gravity, integrates velocities, resolves the ground collider and
  fires overlap callbacks, so a scripted "bot" can actually play a run and score.

| Suite | Covers |
|---|---|
| `unit/persistence` | defaults, round-trip, corrupt JSON, old-save migration, storage that throws |
| `unit/energy` | the 30s regen ladder, the cap of 5, partial-interval accumulation |
| `unit/login-streak` | same day / next day / skipped day, the 7-day reward cycle |
| `unit/source-contract` | one inline script, no CDN or network calls, no external assets, game config, fatal-error overlay |
| `integration/boot-and-menu` | texture generation, menu render, energy gate on PLAY, simulated ad, login claim, leaderboard render |
| `integration/shop-and-cosmetics` | price ladder, affordability, level cap, trail equip, upgrades reaching the next run |
| `integration/game-run` | intro, jump rules, spawn geometry, scoring, streak escalation, shard pickup, guard pulse, a scripted bot surviving 10s |
| `integration/background-and-feel` | parallax layer order/speeds, cloud wrapping, contact shadow, stork hitbox, scenery surviving a revive |
| `integration/run-end-and-meta` | payout, best-score, gacha, game-over panel, revive, initials entry, top-10 capping |

Two real bugs were found and fixed while writing these (both have regression tests):

1. **Session-only saves were lost.** `safeGetItem()` only consulted the in-memory
   fallback when *reads* threw. Safari private mode and quota-exceeded throw on
   `setItem` while `getItem` still works, so every scene transition silently reloaded a
   default profile. It now prefers the in-memory copy once a write has failed.
2. **Half the board survived a revive.** `onHit()` and `reviveContinue()` destroyed
   sprites inside `Group.children.iterate()`. Destroying a child splices the group's
   entries while `iterate()` holds the original length, so every second match was
   skipped — leaving obstacles sitting on top of the just-revived player. Both now iterate
   over a copy.

One asymmetry is documented rather than changed: obstacles get a 6s cleanup timer, shards
don't, so uncollected shards live as off-screen bodies for the whole run
(`known gap: ...` in `integration/game-run`).

## Where each blueprint phase lives in the code

- **Phase 1 (Core Loop)** — `GameScene.jump()`, the 3-second intro overlay in `create()`, and `scene.restart()` on retry (zero-friction restart).
- **Phase 2 (Meta-Progression)** — `saveData.upgrades` (jump/magnet/guard), the shop in `MenuScene.openShop()`, shards earned per run in `onShard()`/`endRun()`.
- **Phase 3 (Dopamine Amplification)** — streak multiplier and camera flash/beep escalation in `GameScene.update()`, particle bursts in `onShard()`/`onHit()`.
- **Phase 4 (Monetization, simulated)** — `showAdForEnergy()`, `showAdRevive()`, and the trail-color gacha spin in `endRun()`.
- **Phase 5 (Retention/Social, simulated)** — `checkLoginStreak()` / `loginStreakReward()` (daily streak calendar) and the local leaderboard in `promptInitials()` / `MenuScene.create()`.

## Still needs a human pass

A real in-browser click-through still hasn't been done in this environment (no headless
browser available here). The test suite covers the logic and the scene wiring against a
fake Phaser, which is not the same as the real renderer: nothing here verifies that the
canvas actually draws, that touch input lands where it should on a phone, or that the
Web Audio beeps sound right. Play through it once yourself before treating it as
launch-ready — the jump timing in particular is tuned by feel, and the tests only prove
the window is wide enough in the simulated physics (a scripted bot clears storks at
~95px of lead).
