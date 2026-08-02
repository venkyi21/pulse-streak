# Game development playbook — idea to published

A reusable, gated checklist for shipping a small mobile game fast **without**
trading away quality. Written from what actually worked and what actually cost
time on Pulse Streak (see [BENCHMARK.md](BENCHMARK.md) for that post-mortem).

**Target:** a solo developer or tiny team, 2–4 weeks to a store submission.

**How to use it:** each phase has a checklist and an **exit gate**. Do not enter
the next phase until the gate passes. The gates are the whole point — they are
what stops you polishing art for a game that isn't fun, or generating assets
against a spec you never read.

---

## Critical path at a glance

```
0. Foundations      (½ day)  repo + CI before any game code
1. Idea             (½ day)  pitch, player, success metrics
2. PRD              (1 day)  scope, non-goals, acceptance criteria   ← GATE
3. Prototype        (2-4 d)  grey-box core loop only
4. Fun test         (½ day)  real players on a real device           ← GATE: is it fun?
5. Production       (3-5 d)  build the real thing
6. Test engineering (2-3 d)  automated, running shipped code
7. Art & audio      (2-4 d)  benchmark, iterate, review visually
8. Accessibility    (1 day)  contrast, motion, sound-off
9. Device matrix    (1 day)  low-end hardware, performance           ← GATE
10. Compliance      (1 day)  privacy, licences, permissions
11. Store prep      (1 day)  read specs FIRST, then generate
12. Beta            (2-5 d)  staged rollout, not straight to prod    ← GATE
13. Submit          (½ day)
14. Post-launch     (ongoing)
```

---

## Phase 0 — Foundations · ½ day

Do this **before writing a line of game code**. On Pulse Streak this came last,
and every hour of CI pain traced back to it.

- [ ] `git init`, first commit, push to a remote
- [ ] `.gitignore` covering secrets, build output, and **encoded** secrets (`*.b64`)
- [ ] Pin the toolchain version in `engines` **and** in CI — identical values
- [ ] CI running on every push from commit #1, even if it only runs `echo ok`
- [ ] Licence decision made deliberately (public repo ≠ open source)
- [ ] `README` with how to run it in one command

> **Trap:** a Node/JDK version that differs between your machine and CI will
> fail *only* in CI, and you will lose an afternoon. Pin both on day zero.

**Exit gate:** a trivial change can go commit → push → green CI without you touching anything.

## Phase 1 — Idea & validation · ½ day

- [ ] One-line pitch a stranger understands
- [ ] Target player described in one sentence
- [ ] The single core mechanic named — if you need two sentences, it's two games
- [ ] 3 competitors played for 10 minutes each; what they do badly written down
- [ ] **Success metrics written down**: installs, D1, D7, session length
- [ ] Kill criteria: what result would make you stop?

> **Trap:** skipping metrics. Without them, "did it work?" becomes unanswerable
> and every later decision is vibes.

**Exit gate:** you can state the pitch, the player, and what success looks like numerically.

## Phase 2 — PRD · 1 day · ⛔ GATE

The step most often skipped, and the one that prevents scope creep later.

- [ ] **Scope**: the features v1.0 ships with
- [ ] **Non-goals**: written explicitly — what v1.0 will *not* have
- [ ] Core loop described beat by beat (what the player does in 10 seconds)
- [ ] Progression and economy: currencies, costs, unlock pacing
- [ ] Failure and retry: what happens on death, how fast can they retry
- [ ] Acceptance criteria per feature — testable statements, not adjectives
- [ ] Platform, orientation, minimum device
- [ ] Monetisation decided (including "none") — and if ads, decide **now**, since it changes privacy, compliance and audience rules
- [ ] Art direction reference: name a real product you're benchmarking

**Exit gate:** every v1.0 feature has an acceptance criterion, and the non-goals list is not empty.

## Phase 3 — Prototype · 2–4 days

Grey boxes. Rectangles and circles. **No art.**

- [ ] Core loop playable end to end
- [ ] Input feel tuned (jump arc, responsiveness) — this is the game
- [ ] Difficulty ramp roughed in
- [ ] Runs on a real phone, not just desktop
- [ ] Nothing else — no menus, shop, or progression yet

> **Trap:** making art before the loop is fun. Art makes a bad game look
> finished, which makes it harder to abandon.

**Exit gate:** you want to play it again, using rectangles.

## Phase 4 — Fun test · ½ day · ⛔ GATE

- [ ] **5 people from the target audience** play it — if it's for kids, *actual kids*
- [ ] Watch them; do not explain the controls
- [ ] Note: where they fail, where they smile, where they stop
- [ ] Ask one question: "would you play again?"
- [ ] Difficulty adjusted from what you observed, not what you feel

> **Trap:** testing only on yourself. You are the worst possible tester —
> you know the timing, and you already like it.

**Exit gate:** ≥3 of 5 asked to play again without prompting. **If not, return to Phase 3 or kill it.**

## Phase 5 — Production build · 3–5 days

- [ ] Core loop hardened
- [ ] Menus, progression, economy, persistence
- [ ] Save format versioned from the first write, with a migration path
- [ ] Every save write wrapped — storage can throw, not just return null
- [ ] Error surface: a fatal error must show something, never a blank screen

**Exit gate:** every PRD acceptance criterion is met.

## Phase 6 — Test engineering · 2–3 days

- [ ] Tests exercise the **shipped artifact**, not a copy of the logic
- [ ] Test doubles replicate the real library's semantics, including its quirks
- [ ] Pure logic (economy, timers, persistence) unit-tested exhaustively
- [ ] Integration tests drive real input handlers, not internal methods
- [ ] A scripted bot can play a full run — proves the game is winnable
- [ ] Every bug found gets a regression test, **verified to fail without the fix**
- [ ] CI gate: tests must pass before any release build
- [ ] Linter and formatter configured

> **What worked on Pulse Streak:** a `vm` harness that reads the shipped HTML
> and evaluates its script against a fake engine. Tests could never drift from
> the real code. The one bug nobody would have found by inspection surfaced only
> because the fake replicated the engine's exact iterator semantics.

**Exit gate:** CI green, and you trust the suite enough to refactor without fear.

## Phase 7 — Art & audio · 2–4 days

- [ ] Named visual benchmark (a real shipped product)
- [ ] Concepts **rendered and compared** before committing to one
- [ ] Reserve one colour exclusively for hazards; forbid it in backgrounds
- [ ] Character silhouette readable at final size against the real background
- [ ] Contrast checked against the actual playfield, not a design canvas
- [ ] HUD legible on the brightest and darkest scene
- [ ] **Look at the art at its real size** — a 34px sprite is not a 400px render
- [ ] Audio: at minimum, distinct feedback for success, failure and reward

> **Trap:** tests can verify art *exists*; only your eyes verify it *works*.
> Every visual flaw on Pulse Streak — iris rings reading as spectacles, eyes
> merging, foliage cluttering the hazard band — was found by rendering a frame
> and looking at it.

**Exit gate:** a stranger can identify the player, the hazard and the collectible in one glance.

## Phase 8 — Accessibility & polish · 1 day

- [ ] Playable with sound off (never rely on audio alone for feedback)
- [ ] Colour-blind safe: hazards distinguished by shape/brightness, not hue alone
- [ ] Reduced-motion consideration for heavy screen shake or flashing
- [ ] One-handed reachability for all touch targets
- [ ] Touch targets ≥ 44dp
- [ ] Text legible at the smallest supported screen

**Exit gate:** the game is playable muted, and hazards read in greyscale.

## Phase 9 — Device matrix & performance · 1 day · ⛔ GATE

- [ ] Tested on a **low-end** device, not just your own phone
- [ ] Tested on at least 3 devices / 2 OS versions / 2 aspect ratios
- [ ] Frame rate measured, not assumed
- [ ] Battery and heat sanity-checked over a 10-minute session
- [ ] Saves survive a force-close and an app update
- [ ] Orientation lock verified
- [ ] Cold-start time acceptable

**Exit gate:** smooth on the cheapest device you expect players to own.

## Phase 10 — Compliance · 1 day

- [ ] Permissions audited — remove every one you don't use
- [ ] Privacy policy written to match **actual** behaviour, and hosted publicly
- [ ] Policy URL returns 200 (a dead link is a common rejection)
- [ ] Third-party licences attributed and shipped
- [ ] Content rating answers prepared honestly
- [ ] If targeting children: consent, ads and data rules reviewed for your market
- [ ] No misleading UI — if a button says "watch ad", an ad must play
- [ ] Signing key generated, **backed up in two places**, never committed

> **Trap:** an AAB upload can require handing your signing key to the store. An
> APK does not. Decide deliberately; you cannot take a key back.

**Exit gate:** every claim in the listing and policy is something you could prove.

## Phase 11 — Store prep · 1 day

**Read the store's spec sheet before generating a single asset.**

- [ ] Store requirements printed/copied into a checklist: exact icon sizes, screenshot dimensions, target SDK minimum, format
- [ ] Assets generated **to those numbers**
- [ ] Launcher icon replaced — it is **not** the same as the store listing icon
- [ ] Screenshots show real gameplay at the required aspect
- [ ] Listing copy written; keywords researched for the target market
- [ ] **Localised** for the market you're launching in
- [ ] Support email that isn't your personal inbox
- [ ] A dry-run build that compiles and signs without publishing

> **Trap — the pattern behind every delay on Pulse Streak:** assuming a spec
> instead of reading it. Wrong screenshot size, forgotten launcher icon, a
> hand-rolled file format the build toolchain rejected. All preventable by one
> pass through the store's own documentation.

**Exit gate:** every asset matches a written requirement you have actually read.

## Phase 12 — Beta & staged rollout · 2–5 days · ⛔ GATE

- [ ] Internal test track first
- [ ] 5–20 external testers on their own devices
- [ ] Crash-free session rate observed
- [ ] Feedback triaged: fix blockers, log the rest
- [ ] Staged rollout planned (not 100% on day one)

**Exit gate:** no blocker reports from testers over 48 hours.

## Phase 13 — Submit · ½ day

- [ ] Final build tagged, signed, reproducible from a clean checkout
- [ ] Version code increments; version name is human-readable
- [ ] Release notes written
- [ ] Submitted — then **do not touch the listing** while in review
- [ ] Rejection playbook ready: read the cited policy, fix, bump, resubmit

## Phase 14 — Post-launch · ongoing

- [ ] Watch crash reports and the support inbox daily for the first week
- [ ] Measure against the Phase 1 success metrics
- [ ] Ship a fix release within 2 weeks — it signals the app is alive
- [ ] Decide from data, not vibes: iterate, pivot, or stop

---

## Speed rules

Being fast is about **not doing wasteful work**, not about rushing.

| Rule | Why |
|---|---|
| Timebox every phase; ship the timebox | A perfect Phase 7 with no Phase 4 is wasted work |
| Grey-box before art | The loop is the game; art is amplification |
| Procedural or free assets for v1 | Art pipelines are where solo projects die |
| Zero-dependency tests | No install, no version churn, no supply chain |
| Automate the release once, early | Manual signing is a tax on every future build |
| Read the spec before producing to it | The single highest-ROI habit in this list |
| Never hand-roll a format a toolchain consumes | Use a standard encoder; toolchains are stricter than viewers |
| Verify by extraction | Open the built artifact and check what's inside — don't trust the build log |

## The four gates, restated

If you keep nothing else from this document:

1. **PRD gate** — non-goals written, acceptance criteria testable
2. **Fun gate** — 5 target players, 3 ask to play again, *before* any art
3. **Device gate** — smooth on the cheapest phone you expect players to own
4. **Beta gate** — external testers, 48 hours, no blockers

Phases can be compressed. **Gates cannot be skipped** — each one exists because
skipping it costs more later than it saves now.
