# New game blueprint — copy this file into your next project

A fill-in-the-blanks template. Six one-week sprints, seven milestones, four
hard gates. Replace every `⟨placeholder⟩`, tick boxes as you go, and do not pass
a ⛔ gate until its criterion is genuinely met.

> Derived from shipping Pulse Streak. The reasoning behind each step is in
> [AGILE-GDLC.md](../AGILE-GDLC.md); the traps are in [BENCHMARK.md](../BENCHMARK.md).

---

## Project card — fill in before Sprint 0 ends

| Field | Your answer |
|---|---|
| Working title | ⟨name⟩ |
| One-line pitch | ⟨a stranger understands it⟩ |
| Target player | ⟨one sentence⟩ |
| Core mechanic | ⟨one verb⟩ |
| Platform / orientation | ⟨Android portrait / …⟩ |
| Minimum device | ⟨cheapest phone you'll support⟩ |
| Art benchmark | ⟨a real shipped product⟩ |
| Monetisation | ⟨none / ads / IAP — decide now⟩ |
| Launch market + languages | ⟨India: English + Hindi⟩ |
| Package id (permanent) | ⟨com.example.game⟩ |
| Ship date target | ⟨date⟩ |

### Success metrics — write numbers, not adjectives

| Metric | Target | Actual |
|---|---|---|
| Installs, first 30 days | ⟨n⟩ | |
| D1 retention | ⟨%⟩ | |
| D7 retention | ⟨%⟩ | |
| Median session length | ⟨mm:ss⟩ | |
| Crash-free sessions | ⟨99%+⟩ | |
| "Play again?" rate in playtests | ⟨≥60%⟩ | |

**Kill criteria:** if ⟨metric⟩ is below ⟨value⟩ by ⟨date⟩, I will ⟨stop / pivot⟩.

---

# SPRINT 0 — Foundations & design · Week 1
**Goal:** ⟨the design is agreed and the pipeline works, before any game code⟩
**Milestones:** M0 Concept, M1 Design review

### Day 1 — Pipeline before product

- [ ] `git init`, first commit, push to a remote
- [ ] `.gitignore`: secrets, **encoded secrets** (`*.b64`), build output, `node_modules`
- [ ] Pin the toolchain version in `engines` **and** CI — identical values
- [ ] CI workflow running on push (start with lint + a trivial test)
- [ ] Licence decision recorded (public repo ≠ open source)
- [ ] README: how to run it in one command

> Steal the working versions from Pulse Streak: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml),
> [`.gitignore`](../.gitignore), [`scripts/sync-version.js`](../scripts/sync-version.js).

### Day 2 — Concept

- [ ] Pitch, target player, core mechanic written in the project card
- [ ] Play 3 competitors for 10 minutes each; note what they do badly
- [ ] Success metrics and kill criteria filled in
- [ ] Riskiest assumption named: ⟨what must be true for this to work?⟩

### Day 3–4 — PRD

- [ ] **Scope** — features v1.0 ships with
- [ ] **Non-goals** — written explicitly, and not empty
- [ ] Core loop described beat by beat (what happens in 10 seconds)
- [ ] Progression / economy: currencies, costs, pacing
- [ ] Failure and retry: what happens on death, how fast to retry
- [ ] Acceptance criteria per feature — testable statements
- [ ] Monetisation decided (changes privacy, compliance and audience rules)
- [ ] Art direction reference named

### Day 5 — Design review & backlog

- [ ] Re-read the PRD cold, or walk someone through it
- [ ] Backlog seeded: epics → stories → tasks
- [ ] Backlog ordered by **risk**, not by comfort
- [ ] Sprint 1 stories meet Definition of Ready

⛔ **GATE M1** — non-goals list is not empty, and every v1.0 feature has a testable acceptance criterion.

---

# SPRINT 1 — Prototype · Week 2
**Goal:** ⟨grey-box core loop, playable on a phone⟩
**Milestone:** M2 First playable

- [ ] Core mechanic with primitive shapes only
- [ ] Input feel tuned: latency, responsiveness, arc/curve
- [ ] Difficulty ramp roughed in
- [ ] Failure and retry loop closed
- [ ] Installable build on a real device
- [ ] **No art. No menus. No economy.**

### Playtest — book this before you need it

- [ ] 5 target players lined up
- [ ] They play without you explaining the controls
- [ ] Record: where they fail, where they smile, where they stop
- [ ] Ask each one: *"Do you want to play again?"*

| Tester | Played again? | Where they struggled | Quote |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |

⛔ **GATE M2** — ≥3 of 5 asked to play again. **If not: iterate here or kill the idea. Do not build art.**

---

# SPRINT 2 — Vertical slice · Week 3
**Goal:** ⟨one scene at final quality, proving the bar⟩
**Milestone:** M3 Vertical slice

- [ ] Art direction applied to **one** scene only
- [ ] Character and hazard readable at real size, on a real screen, at arm's length
- [ ] One colour reserved exclusively for hazards; forbidden in backgrounds
- [ ] Audio: distinct feedback for success / failure / reward
- [ ] HUD legible against the brightest and darkest part of the scene
- [ ] Test harness stood up; core logic under test
- [ ] CI gate: tests must pass before a build is produced

> **Look at the art at final size.** A 34px sprite is not a 400px render. Every
> visual bug on Pulse Streak was found by rendering a frame and inspecting it.

⛔ **GATE M3** — a stranger identifies the player, the hazard and the collectible at a glance.

---

# SPRINT 3 — Feature complete · Week 4
**Goal:** ⟨everything in PRD scope exists⟩
**Milestone:** M4 Alpha

- [ ] Progression, economy, persistence
- [ ] Save format versioned from the first write, with a migration path
- [ ] Every storage access wrapped — it can **throw**, not just return null
- [ ] Menus, settings, game-over flow
- [ ] Fatal errors surface visibly — never a blank screen
- [ ] Integration tests drive real input handlers, not internal methods
- [ ] A scripted bot can complete a full run
- [ ] Non-goals re-read: did anything sneak in?

⛔ **GATE M4** — every acceptance criterion passes; no v1.0 feature missing.

---

# SPRINT 4 — Hardening · Week 5
**Goal:** ⟨no known blockers; works beyond your own phone⟩
**Milestone:** M5 Beta

### Quality

- [ ] Bug backlog triaged: blocker / major / minor — fix blockers only
- [ ] Every fix gets a regression test, **verified to fail without the fix**
- [ ] Saves survive force-close and an app update

### Devices

| Device | OS | Aspect | Result |
|---|---|---|---|
| ⟨low-end⟩ | | | |
| ⟨mid⟩ | | | |
| ⟨yours⟩ | | | |

- [ ] Frame rate measured, not assumed
- [ ] Cold start acceptable on the cheapest device
- [ ] Battery/heat sane over 10 minutes

### Accessibility

- [ ] Playable with sound off
- [ ] Hazards readable in greyscale (not hue alone)
- [ ] Touch targets ≥44dp, reachable one-handed
- [ ] Heavy shake/flash reconsidered

### External beta

- [ ] 5–20 testers on their own devices
- [ ] Feedback triaged; blockers fixed

⛔ **GATE M5** — 48 hours of external testing with zero blocker reports.

---

# SPRINT 5 — Release candidate · Week 6
**Goal:** ⟨submission-ready, nothing assumed⟩
**Milestone:** M6 Release candidate

### Read the spec FIRST, then produce

- [ ] Store requirements copied into this table **before** generating anything:

| Requirement | Store says | Mine |
|---|---|---|
| Target SDK minimum | ⟨⟩ | |
| Icon size | ⟨⟩ | |
| Screenshot dimensions | ⟨⟩ | |
| Screenshot count min/max | ⟨⟩ | |
| Feature graphic | ⟨⟩ | |
| Accepted formats | ⟨⟩ | |

- [ ] Assets generated to those exact numbers
- [ ] **Launcher icon replaced** — it is *not* the store listing icon
- [ ] Screenshots show real gameplay

### Compliance

- [ ] Permissions audited — delete every unused one
- [ ] Privacy policy live, URL returns 200, matches actual behaviour
- [ ] Third-party licences attributed and shipped
- [ ] Content rating and data-safety answers prepared honestly
- [ ] No misleading UI — if a button says "watch ad", an ad must play
- [ ] Support email that is not your personal inbox
- [ ] Localised for the launch market

### Release

- [ ] Signing key generated, **backed up in two places**, never committed
- [ ] Build reproducible from a clean checkout
- [ ] Artifact **verified by extraction** — open it, check signature/icon/manifest
- [ ] Decide APK vs bundle deliberately (a bundle upload may require surrendering your signing key)
- [ ] Staged rollout planned

⛔ **GATE M6** — every asset matches a requirement you have actually read.

---

# SPRINT 6 — Launch & live · Week 7+
**Milestone:** M7 Live

- [ ] Submitted; listing untouched during review
- [ ] Rejection playbook ready: read the cited policy → fix → bump → resubmit
- [ ] Crash and support inbox checked daily for week one
- [ ] Measured against the Sprint 0 success metrics
- [ ] First patch shipped within two weeks
- [ ] Project retro written

---

## Reusable per-sprint block — copy once per sprint

```markdown
## Sprint ⟨n⟩ · ⟨dates⟩
**Goal:** ⟨one sentence⟩

### Committed
- [ ] ⟨story⟩ — acceptance: ⟨testable⟩
- [ ] ⟨story⟩ — acceptance: ⟨testable⟩

### Daily log
Mon — did / doing / blocked
Tue — …

### Review
Who played it: ⟨name⟩   What they said: ⟨…⟩

### Retro
Keep: ⟨…⟩   Drop: ⟨…⟩   Try: ⟨…⟩

### Done check
- [ ] Acceptance criteria met   - [ ] Tests passing   - [ ] CI green
- [ ] Ran on a real device      - [ ] Someone else played it
- [ ] Tagged build produced
```

## Story template

```markdown
STORY: As a ⟨player⟩, I want ⟨capability⟩ so that ⟨value⟩
Acceptance:
  - ⟨testable statement⟩
  - ⟨testable statement⟩
Verified by: ⟨unit test / playtest / measurement⟩
```

---

## The eight rules that save the most time

1. **Pipeline before product** — git and CI on day one, not day thirty
2. **Pin toolchain versions in CI and `engines`** — identical, from commit #1
3. **Grey-box until the fun gate passes** — art makes bad games hard to abandon
4. **Someone else plays every sprint** — you cannot review your own build
5. **Read the spec before producing to it** — the single most expensive habit in mobile
6. **Never hand-roll a format a toolchain consumes** — build tools are stricter than viewers
7. **Verify by extraction** — open the built artifact; don't trust the build log
8. **"Done" includes on a device** — desktop-only is a hypothesis, not a feature

## Starter kit — proven files to copy

| From Pulse Streak | Gives you |
|---|---|
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | Test + boot + version + asset gate on every push |
| [`.github/workflows/release.yml`](../.github/workflows/release.yml) | Tag → signed build → GitHub Release, with secret guards |
| [`.gitignore`](../.gitignore) | Secrets, encoded secrets, build output |
| [`scripts/sync-version.js`](../scripts/sync-version.js) | One version source → app + native + in-game, drift fails the build |
| [`scripts/patch-android.js`](../scripts/patch-android.js) | Portrait lock, signing config, permission removal, idempotent |
| [`scripts/lib/raster.js`](../scripts/lib/raster.js) | Render procedural art to PNG for icons/screenshots |
| [`tests/harness.js`](../tests/harness.js) | Pattern for testing the shipped artifact rather than a copy |
| [`DEPLOY.md`](../DEPLOY.md) · [`SUBMISSION.md`](../SUBMISSION.md) | Release and store runbooks |
