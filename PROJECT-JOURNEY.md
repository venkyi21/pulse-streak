# Pulse Streak — end-to-end development record

Idea → design → build → test → package → publish. Every row is something that
actually happened, in order, with the decision behind it. Dates are 2026.

**Outcome:** submitted to the Indus Appstore on 1 Aug 2026 as
`com.pulsestreak.game` v1.0.3, status *In Review*.

---

## Phase overview

| # | Phase | Output | Status |
|---|---|---|---|
| 1 | Concept & positioning | GTM plan, one-line pitch, target player | ✅ |
| 2 | Design blueprint | 5-phase mechanic spec baked into the source | ✅ |
| 3 | Build | Single-file Phaser 3 game, procedural art | ✅ |
| 4 | Test engineering | 149 tests, custom harness, 4 real bugs found | ✅ |
| 5 | Art direction | Kid-facing redesign benchmarked to Lingokids | ✅ |
| 6 | Product integrity | Fake ad flows removed before release | ✅ |
| 7 | Packaging | Capacitor → signed Android app | ✅ |
| 8 | Release engineering | Git, CI/CD, semver → versionCode | ✅ |
| 9 | Compliance | Privacy policy, licensing, zero permissions | ✅ |
| 10 | Store submission | Listing, assets, upload | ✅ In Review |

---

## 1 — Concept & positioning

| Action | Decision / rationale |
|---|---|
| Chose the core hook | Streaks as the dopamine loop, in-run *and* across days — the retention lever most hyper-casual runners bury behind generic "come back tomorrow" nagging |
| Defined the target player | The "daily streak" crowd rather than leaderboard grinders |
| Wrote the GTM plan | [GTM_PLAN.md](GTM_PLAN.md) — pitch, channels, listing copy |
| Set the constraint | One HTML file, no CDN, no assets, no server — runs from `file://` |

## 2 — Design blueprint

A five-phase spec, written into the source header so intent stays next to code:

| Phase | Mechanic | Lives in |
|---|---|---|
| 1. Core loop | One tap = jump; zero-friction retry; 3-second intro | `GameScene.jump()`, intro overlay |
| 2. Meta-progression | Shards fund Jump Boost / Shard Magnet / Guard Pulse | `MenuScene.openShop()` |
| 3. Dopamine | Streak escalates speed, flash, pitch | `GameScene.update()` |
| 4. Monetization | Energy gate, free continue, cosmetic gacha | `showEnergyWait()`, `endRun()` |
| 5. Retention | 7-day login calendar, local top-10 | `checkLoginStreak()`, `promptInitials()` |

## 3 — Build

| Action | Detail |
|---|---|
| Engine | Phaser 3, vendored locally as `phaser.min.js` (MIT) |
| Architecture | One `index.html`, one inline script — no bundler, no module system |
| Art pipeline | 100% procedural via `Graphics.generateTexture()`; no image or audio files |
| Audio | Web Audio oscillators, synthesised at runtime |
| Persistence | `localStorage`, single versioned key |

## 4 — Test engineering

The hard problem: the game is one inline `<script>` with nothing to `import`.

| Action | Decision / rationale |
|---|---|
| Rejected duplicating logic into a test copy | It would rot immediately |
| Built [tests/harness.js](tests/harness.js) | Reads `index.html`, extracts the inline script **verbatim**, evaluates it in a `vm` against a fake Phaser + fake `localStorage` + fake DOM. Tests run the shipped code |
| Made the fakes faithful where it matters | `Group.children.iterate()` caches length and walks the live array, and destroy splices the group — matching Phaser's `Structs.Set`, so destroy-while-iterating bugs surface instead of being smoothed over |
| Built a physics loop | `runFrame()` applies gravity, integrates velocity, resolves the ground collider, fires overlaps — so a scripted bot can genuinely play a run and score |
| Chose the runner | Node's built-in `node:test` — **zero dependencies to install** |

### Suites — 149 tests

| Suite | Tests | Covers |
|---|---|---|
| `unit/persistence` | 11 | defaults, round-trip, corrupt JSON, old-save migration, storage that throws |
| `unit/energy` | 9 | 30s regen ladder, cap, partial-interval accumulation |
| `unit/login-streak` | 9 | same/next/skipped day, 7-day reward cycle |
| `unit/source-contract` | 10 | one inline script, no network, no assets, config, fatal-error overlay |
| `unit/release-metadata` | 12 | version chain, no ad SDK, no tracked secrets |
| `integration/boot-and-menu` | 16 | textures, menu, energy gate, login claim, leaderboard |
| `integration/game-run` | 29 | intro, jump rules, spawn geometry, scoring, streak, guard pulse |
| `integration/run-end-and-meta` | 26 | payout, gacha, continue, initials, top-10 capping |
| `integration/shop-and-cosmetics` | 14 | price ladder, level cap, trail equip |
| `integration/background-and-feel` | 13 | parallax order/speeds, cloud wrap, contact shadow |

### Bugs the tests found — all four were real

| # | Bug | Impact | Fix |
|---|---|---|---|
| 1 | `safeGetItem()` only used its in-memory fallback when *reads* threw | Safari private mode / quota-exceeded throw on **write** while reads work — every scene change silently reloaded a default profile, losing all progress mid-session | Prefer the in-memory copy once a write has failed |
| 2 | `onHit()` and `reviveContinue()` destroyed sprites inside `children.iterate()` | Destroy splices the group while iterate holds the original length → every second match skipped. Revive left obstacles sitting on the just-revived player | Iterate over a copy |
| 3 | Intro's demo obstacle was never destroyed | Present since the first build: it hung mid-screen for the whole run, looking like an obstacle that could be neither hit nor cleared | Capture it and destroy with the rest of the intro |
| 4 | CI pinned Node 20 | The test script uses a glob, and `node --test` glob support arrived in Node 22 — every CI run failed instantly while local dev on Node 24 passed | Node 22 in CI, `engines: >=22` |

Each has a regression test, and each was **verified to fail without its fix**.

## 5 — Art direction

Benchmarked against Lingokids: saturated primaries, chunky rounded forms,
high-key light, no thin detail that dies at small sizes.

| Action | Decision / rationale |
|---|---|
| Replaced the rounded-rect player | Round fluffy critter (34×34): oversized eyes, blush, paws. **Kept the exact texture size** so hitbox, jump arc and difficulty were untouched |
| Built a software rasterizer | The tests can't tell you if art is *cute*. [scripts/lib/raster.js](scripts/lib/raster.js) replays the game's own draw ops to a PNG so the art can be looked at |
| Iterated on what the renders showed | Amber iris rings read as spectacles at 34px → removed. Eyes merged into one band → separated. Second glints looked like dirt → removed |
| Presented 4 background concepts | Rendered mockups, not prose — with the real sprites composited so contrast judgements were honest |
| Chose Candy Meadow + framing | Five parallax layers, each scrolling at a fraction of run speed, so the meadow accelerates with the streak for free |
| Replaced the pink spike with a stork | Same 50×50 texture → identical collision. Black reserved as the hazard colour so nothing in the background may use it |
| Fixed contrast, twice | White critter dissolved into a bright sky → dark rim + contact shadow. White HUD text vanished → dark text with white outline |
| Caught by rendering, not testing | Verge flowers grew to stork height and cluttered the hazard-reading band; the sun halo had a hard edge |
| Moved the cosmetic | "Trail Colors" tinted the *player*, which would have turned the white fluffball magenta. Now tints the particle trail — which is what the name always implied |

## 6 — Product integrity

| Action | Decision / rationale |
|---|---|
| Removed the fake rewarded ads | `showAdRevive()` and `showAdForEnergy()` ran 3-second countdowns and then granted the reward **unconditionally**. Shipping that is misleading, and in a kids' title it is a policy problem |
| Replaced with honest equivalents | `CONTINUE (free)` and "Out of energy — next heart in Ns" (new testable `energyEtaSeconds()`) |
| Locked it down | A test strips comments from the shipped source and fails if ad copy or an ad SDK reappears |
| Corrected the licence | Public repo + `"license": "MIT"` would have let anyone clone and republish the game. Now `UNLICENSED` + [COPYRIGHT.md](COPYRIGHT.md) |

## 7 — Packaging

| Action | Decision / rationale |
|---|---|
| Chose Capacitor over TWA/Cordova | The game is fully self-contained, so it bundles offline; a TWA would need an HTTPS host for no gain |
| Discovered Android Studio was unnecessary | `cap add android` needs no SDK or JDK, and CI builds the app — saved a 1GB install |
| Automated the native patches | [scripts/patch-android.js](scripts/patch-android.js): portrait lock, signing config, cleartext off, **INTERNET permission removed** — fails loudly if Capacitor's templates change |
| Dropped `INTERNET` | The app makes no network requests. "Requests no permissions at all" is a materially stronger claim for a kids' app than explaining an unused one |
| Generated launcher icons | 15 PNGs from the game's own critter — required adding an alpha channel to the rasterizer, since adaptive foregrounds must be transparent |

## 8 — Release engineering

| Action | Decision / rationale |
|---|---|
| `git init` | The project had **no version history at all** until this point |
| Single source of truth | `package.json` version → `versionName`, `versionCode` (`1.2.3` → `10203`), and in-game `APP_VERSION`. Drift fails the build |
| CI on every push | 149 tests + boot check + version consistency + asset dimensions |
| Tag-driven releases | `v*` → test → verify tag matches → build signed `.aab` + `.apk` → GitHub Release → wipe keystore from the runner |
| Guarded the traps | Missing secrets fail loudly instead of producing a silently unsigned bundle; `*.b64` gitignored because a base64 keystore *is* the keystore |
| Keystore | 4096-bit RSA, valid to 2053, never leaves the user's machine except as an encrypted GitHub secret |

## 9 — Compliance

| Action | Detail |
|---|---|
| Privacy policy | Written to match what tests verify, hosted on GitHub Pages, HTTP 200 confirmed |
| Data position | No collection, no ads, no analytics, no accounts, no network, no permissions |
| Kids' audience | India's DPDP Act 2023 — no personal data of any user is processed, so no consent mechanism is required |
| Third-party licences | Phaser MIT attribution in [THIRD-PARTY-LICENSES.md](THIRD-PARTY-LICENSES.md) |
| Contact | Plus-alias so store mail is filterable and any scraping is traceable |

## 10 — Store submission

| Action | Detail |
|---|---|
| Store assets | Icon, adaptive icon, feature graphic, 3 screenshots — all generated from the game's own textures, so they cannot misrepresent it |
| Fixed the screenshot size | 1080×1800 would have been rejected; the console wants exactly 1080×1920. Scene anchored to the bottom of a true 9:16 frame, extra height becomes sky — no letterboxing |
| Listing copy | Descriptions, rating answers, data-safety answers in [STORE-LISTING.md](STORE-LISTING.md) |
| Real-device test | v1.0.1 installed and played on an Android phone — also proving the permission removal didn't break the WebView |
| Chose APK over AAB at upload | An AAB upload demands your **keystore**, because the store must sign the APKs it generates. The app has no native libs, one language and procedural art, so a bundle offers no split worth surrendering the private key for |
| Submitted | 1 Aug 2026, v1.0.3, *In Review* |

---

## Release history

| Version | Code | Outcome |
|---|---|---|
| v1.0.0 | 10000 | First signed build. First tag failed — Node 20 glob issue |
| v1.0.1 | 10001 | Meadow menu, zero permissions. **Device-tested** |
| v1.0.2 | 10002 | Launcher icons — **build failed**: generated PNGs broke `aapt2` |
| v1.0.3 | 10003 | Icons re-encoded through libpng. **Submitted** |

## By the numbers

| | |
|---|---|
| Game source | 837 lines, one file |
| Test harness | 749 lines |
| Build/asset tooling | ~873 lines |
| Tests | 149, zero dependencies |
| Runtime dependencies | 1 (Phaser, vendored) |
| App size | 3.3 MB |
| Permissions | 0 |
| Network calls | 0 |
| Data collected | 0 |

## What this project got right

- **Tests run the shipped code.** No duplicate copy to drift.
- **Fakes faithful to the real library.** The `iterate()` bug only surfaced because the fake replicated Phaser's exact semantics.
- **Art was looked at, not just asserted.** Every visual flaw found here was found by rendering and inspecting, never by a test.
- **Honesty over theatre.** Fake ads removed, licence corrected, permission dropped, and the privacy policy says only what the tests can prove.
- **Every claim verified.** Signatures extracted from the built APK, the icon pulled back out of the binary, the policy URL fetched — not assumed.

## Known gaps, carried knowingly

| Item | Why it's acceptable |
|---|---|
| Uncollected shards never swept off-screen | Documented in `integration/game-run`; harmless at current volumes |
| Game-over panel still dark | Reads as deliberate contrast against the bright playfield |
| No crash reporting | Adding it would mean collecting data and rewriting the privacy story |
| Tests use a fake Phaser | Mitigated by the real-device test; they can't prove rendering or touch |
