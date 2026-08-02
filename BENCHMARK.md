# Pulse Streak vs. best practice

An honest scorecard of how this project was actually run against how a small
game studio *should* run one, idea to publish. Written to be useful, so the gaps
get more space than the wins.

**Legend:** ✅ met or exceeded · ⚠️ partial · ❌ gap

---

## 1 — Discovery & concept

| Best practice | What we did | |
|---|---|---|
| Written positioning, target player, one-line pitch | GTM plan with a researched retention thesis | ✅ |
| Competitor teardown | Implicit ("most runners bury streaks"), never written down | ⚠️ |
| Validate demand before building | None — went straight from idea to code | ❌ |
| Define success metrics up front | No D1/D7 targets, no install goal, no definition of "worked" | ❌ |

## 2 — Requirements (the "PRD" step)

| Best practice | What we did | |
|---|---|---|
| A real PRD: scope, non-goals, acceptance criteria, metrics | A 5-phase blueprint in a source-code comment | ⚠️ |
| Traceability from requirement → implementation | Each blueprint phase names the functions it lives in | ✅ |
| Explicit non-goals | Never written — scope crept (menu re-skin, video, icons) reactively | ❌ |
| Sign-off before build | None | ❌ |

> **The single biggest process gap.** There was never a PRD. The blueprint
> described *mechanics*, not *requirements*: no acceptance criteria, no success
> metrics, no non-goals. Everything downstream was steered conversationally.

## 3 — Architecture & build

| Best practice | What we did | |
|---|---|---|
| Deliberate tech choice with constraints | Phaser 3 vendored, one file, offline-first | ✅ |
| No unnecessary dependencies | 1 runtime dep, 0 test deps | ✅ |
| Reproducible builds | Lockfile + pinned SDK packages in CI | ✅ |
| Modular code | One 837-line file; fine at this size, won't scale | ⚠️ |
| Asset pipeline | Procedural — art and store graphics come from the same source and cannot drift | ✅ |

## 4 — Quality engineering

| Best practice | What we did | |
|---|---|---|
| Automated tests | 149, running the **shipped** code via a `vm` harness | ✅ |
| Test doubles faithful to real libraries | Fake Phaser replicates `Structs.Set` iterate semantics — which is the only reason bug #2 surfaced | ✅ |
| Tests written alongside code (TDD) | Retrofitted after the game was built | ❌ |
| Regression test per bug, verified failing without the fix | Done for all four | ✅ |
| CI gate on every push | Tests + boot + version + asset checks | ✅ |
| Static analysis / linting | None — no ESLint, no formatter | ❌ |
| Performance profiling | Never measured FPS, memory, or battery on a real device | ❌ |
| Device matrix | **One** phone, one Android version, one screen size | ❌ |

## 5 — Design & art

| Best practice | What we did | |
|---|---|---|
| Explicit visual benchmark | Lingokids, named and worked against | ✅ |
| Review art visually before shipping | Built a rasterizer to render and inspect it | ✅ |
| Concepts compared before committing | 4 background options rendered with real sprites | ✅ |
| Readability/contrast discipline | Hazard colour reserved; contrast fixed twice | ✅ |
| Accessibility | **Nothing**: no colour-blind check, reduced-motion, sound-off, or one-handed consideration | ❌ |
| Sound design | Three synthesised beeps, no music, no mix | ⚠️ |

## 6 — Playtesting & balance

| Best practice | What we did | |
|---|---|---|
| Test with the target audience | **No child ever played it** | ❌ |
| External playtesters | One person: you | ❌ |
| Difficulty tuned from data | Jump window tuned by simulation + one person's feel | ⚠️ |
| Telemetry to validate the core thesis | None — see below | ❌ |

> **The strategic tension.** The whole pitch is that streaks drive retention.
> With no analytics, there is no way to know whether the streak loop works,
> where players drop off, or whether the difficulty curve is right. The
> privacy-first position (which is genuinely valuable, especially for a kids'
> app) was chosen without ever weighing it against measurability.

## 7 — Release engineering

| Best practice | What we did | |
|---|---|---|
| Version control from day one | `git init` came **after** the game was built | ❌ |
| Single source of truth for version | package.json → versionName/versionCode/in-game, drift fails the build | ✅ |
| Tag-driven, signed, reproducible releases | Full CI/CD to a signed artifact | ✅ |
| Secrets never in the repo | Enforced by gitignore **and** a test that scans tracked files | ✅ |
| Keystore custody understood | Backed up; chose APK upload to avoid surrendering the key | ✅ |
| Staged rollout / beta track | **None** — straight to production submission | ❌ |
| Crash reporting | None (deliberate, but means field failures are invisible) | ❌ |

## 8 — Compliance & trust

| Best practice | What we did | |
|---|---|---|
| Privacy policy matching actual behaviour | Written to match what tests verify | ✅ |
| Minimise permissions | Zero | ✅ |
| Honest monetisation | Fake ad flows removed before release | ✅ |
| Licence hygiene | MIT grant caught and corrected; third-party attribution shipped | ✅ |
| Kids-audience rules considered | DPDP position reasoned through | ✅ |
| Independent security review | None (attack surface is tiny, but it was never checked) | ⚠️ |

## 9 — Store & go-to-market

| Best practice | What we did | |
|---|---|---|
| Listing assets from real gameplay | Generated from the game's own textures | ✅ |
| Store requirements verified before upload | Screenshot size caught pre-upload; targetSDK confirmed | ✅ |
| Localisation for the target market | **English only** — for an India-first store that has a dedicated "Indian Language" step | ❌ |
| Promo video | Skipped | ⚠️ |
| ASO: keyword research | Copy written by feel, no keyword research | ❌ |
| Launch plan executed | GTM plan written at concept stage, never actioned | ❌ |

---

## Speed analysis

**What made it fast**

| Accelerator | Effect |
|---|---|
| Single file, no build step | Every change was instantly testable |
| Procedural art | No artist, no asset pipeline, no drift — icons, screenshots and banner all fall out of the game code |
| Zero-dependency tests | No install, no version churn, ~0.3s full suite |
| CI building Android | Avoided a 1GB Android Studio install entirely |
| Verifying by extraction | Reading the built APK caught the wrong icon before a reviewer did |

**What cost time — all self-inflicted, all preventable**

| Cost | Root cause | Preventable by |
|---|---|---|
| 5 failed CI runs | CI on Node 20, dev on Node 24 | Pinning the same version in `engines` **and** CI from the start |
| A wasted release (v1.0.2) | Hand-rolled PNG encoder tripped `aapt2` | Using a standard encoder for anything a toolchain consumes |
| Near-rejection on screenshots | Generated 1080×1800 without checking the spec | Reading store requirements **before** producing assets |
| Late icon discovery | Store icon ≠ launcher icon; assumed done | A pre-submission checklist against the store's own list |
| Three tags to one good build | Cumulative effect of the above | A `--dry-run` release path that builds without publishing |

**The pattern:** every delay came from *assuming a spec instead of reading it*, and
none from the game logic — which the tests covered well.

---

## Top gaps, in priority order

| # | Gap | Why it matters | Cost to close |
|---|---|---|---|
| 1 | **No child has played it** | It's a kids' game. Difficulty, clarity and appeal are unvalidated | An afternoon with 3–5 kids |
| 2 | **No success metrics** | You cannot tell if launch succeeded | 30 minutes writing D1/D7/install targets |
| 3 | **No retention measurement** | The core thesis is untestable as shipped | Needs a privacy-preserving approach (local-only counters surfaced in-game, or an aggregate opt-in) |
| 4 | **English only** | India-first store with a localisation step you skipped | Hindi + Tamil listing copy is cheap; in-game text is minimal |
| 5 | **One-device testing** | Low-end Android is the volume market in India | Borrow 2–3 cheap devices, or a cloud device farm |
| 6 | **No staged rollout** | A bad build reaches 100% of users at once | Use the store's beta track next release |
| 7 | **No accessibility pass** | Colour-blind players, sound-off play, reduced motion | A day |
| 8 | **No linting** | Style drift and easy bugs go uncaught | An hour |

---

## Honest overall read

**Engineering discipline: well above typical for a solo first release.** Tests
that run shipped code, a real CI/CD pipeline, verified signing, enforced version
integrity, and claims checked by extracting the built binary rather than trusting
the build — that is stronger than most indie launches.

**Product discipline: below par.** No PRD, no success metrics, no user testing,
no analytics, no localisation, no staged rollout. The game is *built* well and
*validated* barely at all.

The asymmetry is worth naming plainly: this project could tell you with
confidence that the code is correct, and almost nothing about whether the game
is any good. For v1.1, the highest-value work is not more engineering — it is
putting the game in front of five children and writing down what you'd need to
see to call it a success.
