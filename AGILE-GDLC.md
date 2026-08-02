# Agile game development lifecycle

An iteration-based operating model for shipping a small mobile game: idea →
design review → publish, run as sprints with real ceremonies, artifacts and
milestone gates.

**Companion documents.** [PLAYBOOK.md](PLAYBOOK.md) is *what* to do, as a linear
checklist. This document is *how to organise that work over time* — sprints,
cadence, milestones, and what "done" means. [BENCHMARK.md](BENCHMARK.md) is the
post-mortem the two were written from.

**Target:** solo developer or team of 2–4, one-week sprints, 6 sprints to store.

---

## 1 — How agile has to bend for games

Standard Scrum assumes you know what you're building. Games don't work that way:
**fun is emergent**, discovered by playing, not specified in advance.

| Standard agile | Game reality | The adaptation |
|---|---|---|
| Requirements are knowable | "Is it fun?" can't be specified | Pre-production is timeboxed **discovery**, not estimated delivery |
| Story points estimate work | Prototyping is research | Timebox discovery spikes; estimate only production work |
| Increment = shippable feature | A feature slice may not be playable | Every sprint ends in a **playable build on a device** |
| PO defines value | Players define fun | Playtest data is the source of truth, not the PO's opinion |
| Velocity is the health metric | Velocity can rise while the game gets worse | Track **fun and retention**, not just throughput |

**The core rule:** every sprint produces a build a real person can play on a real
phone. Not a demo, not a screenshot — an installable build.

## 2 — Artifacts

### Product backlog

Structured as **Epic → Story → Task**, ordered by value and risk. Highest-risk
unknowns go first, not last.

```
EPIC: Core loop
  STORY: As a player, one tap makes my character jump
    Acceptance: tap anywhere jumps; only when grounded; <50ms perceived latency
    Tasks: input handler · jump physics · grounded check · device latency test
```

### Definition of Ready — a story may enter a sprint only if

- [ ] It has acceptance criteria that are testable, not adjectives
- [ ] It is small enough to finish inside one sprint
- [ ] Dependencies are resolved or explicitly stubbed
- [ ] It states how it will be verified (test, playtest, or measurement)

### Definition of Done — a story is done only when

- [ ] Acceptance criteria met
- [ ] Automated test written and passing (regression test if it was a bug)
- [ ] CI green
- [ ] Runs on a real device, not just the emulator or desktop
- [ ] No new permissions, no new network calls, no new dependencies without a decision
- [ ] Documentation/comment updated where intent is non-obvious
- [ ] Merged to main — no long-lived branches

> **Non-negotiable:** "done" includes *on a device*. A feature that works only on
> your desktop is not done, it is a hypothesis.

### Sprint backlog

The stories pulled for this sprint plus a **sprint goal in one sentence**. If you
can't write the goal in a sentence, the sprint isn't focused.

### Increment

An installable build, tagged, from CI. Every sprint. No exceptions.

## 3 — Ceremonies, scaled honestly

For a solo developer, don't perform Scrum theatre — keep the *function* of each
ceremony and drop the meeting.

| Ceremony | Team of 2–4 | Solo equivalent | Timebox |
|---|---|---|---|
| Sprint planning | Pick goal + stories | Write the sprint goal and pull 3–5 stories | 30–60 min |
| Daily standup | 15 min sync | 3 lines in a log: did / doing / blocked | 5 min |
| Backlog grooming | Mid-sprint refinement | Re-order the backlog by risk once a week | 20 min |
| **Sprint review** | Demo to stakeholders | **Someone else plays your build** | 30 min |
| Retrospective | What to change | Write 1 keep / 1 drop / 1 try | 15 min |

> The one ceremony you cannot fake solo is the **review**. A build nobody else
> played has not been reviewed. On Pulse Streak, the entire art direction was
> reviewed only by rendering frames and inspecting them — which caught visual
> bugs, but never answered whether a child enjoys it.

## 4 — Milestones

Classic game milestones layered over sprints. These are the **gates**; sprints
are the engine that reaches them.

| Milestone | Means | Exit criteria |
|---|---|---|
| **M0 Concept** | Idea is worth trying | Pitch, target player, success metrics, kill criteria |
| **M1 Design review** | Design is agreed before building | Scope, non-goals, acceptance criteria, art benchmark, monetisation decided |
| **M2 First playable** | The loop exists in grey-box | Core mechanic playable on a device |
| **M3 Vertical slice** | One slice at shippable quality | Loop + art + audio + UI for a single scene; proves the target quality |
| **M4 Alpha** | Feature complete | All v1.0 features present; bugs allowed; content may be rough |
| **M5 Beta** | Content complete | No known blockers; external testers on real devices |
| **M6 Release candidate** | Submission ready | Signed, compliant, store assets to spec, staged rollout planned |
| **M7 Live** | Published | Monitoring, support inbox, first patch planned |

**M1 is the design review** (the "PDR" checkpoint): a deliberate stop where the
design is reviewed and signed off before production burn starts. It is the
cheapest place to change your mind.

## 5 — Six-sprint roadmap

One-week sprints. Compress or extend, but keep the order — each sprint's gate
protects the next sprint's investment.

### Sprint 0 — Foundations & concept → **M0, M1**

**Goal:** the design is agreed and the pipeline works before any game code.

- [ ] Repo, `.gitignore` (secrets *and* encoded secrets), first commit
- [ ] CI running on push from commit #1
- [ ] Toolchain version pinned identically in `engines` and CI
- [ ] Licence decision made deliberately
- [ ] Pitch, target player, core mechanic, 3 competitors played
- [ ] Success metrics and kill criteria written
- [ ] PRD: scope, **non-goals**, acceptance criteria, art benchmark, monetisation
- [ ] Backlog seeded as epics → stories, ordered by risk
- [ ] **Design review held** — even solo, sleep on it and re-read it cold

**Review:** walk someone through the PRD. **Retro:** is the backlog ordered by risk or by comfort?

⛔ **Gate M1:** non-goals list is not empty; every v1.0 feature has a testable acceptance criterion.

### Sprint 1 — Prototype → **M2**

**Goal:** grey-box core loop, playable on a phone.

- [ ] Core mechanic implemented with primitive shapes
- [ ] Input feel tuned — latency, responsiveness, the jump arc
- [ ] Difficulty ramp roughed in
- [ ] Failure and retry loop
- [ ] Installable build on a device
- [ ] **No art, no menus, no economy**

**Review:** 5 target players play it. Watch, don't explain.

⛔ **Gate M2:** ≥3 of 5 ask to play again. If not, iterate here or kill — do not proceed.

### Sprint 2 — Vertical slice → **M3**

**Goal:** one scene at final quality, proving the bar you can hit.

- [ ] Final art direction applied to **one** scene
- [ ] Character and hazard readable at real size on a real screen
- [ ] Audio feedback for success / failure / reward
- [ ] HUD legible against the actual playfield
- [ ] Test harness stood up; core logic under test
- [ ] CI gate: tests must pass before a build

**Review:** show the slice; ask "does this look finished?" **Retro:** was the art benchmark honoured?

⛔ **Gate M3:** a stranger identifies player, hazard and collectible at a glance.

### Sprint 3 — Feature complete → **M4**

**Goal:** everything in the PRD scope exists.

- [ ] Progression, economy, persistence
- [ ] Save format versioned with a migration path from the first write
- [ ] All storage access wrapped — it can throw, not just return null
- [ ] Menus, settings, game-over flow
- [ ] Fatal errors surface visibly, never a blank screen
- [ ] Integration tests drive real input handlers
- [ ] A scripted bot can complete a full run

**Review:** playtest for *completeness*, not polish. **Retro:** did non-goals hold?

⛔ **Gate M4:** every acceptance criterion passes; no missing v1.0 features.

### Sprint 4 — Hardening → **M5**

**Goal:** no known blockers, works beyond your own phone.

- [ ] Bug backlog triaged: blocker / major / minor; blockers only
- [ ] Every fix gets a regression test, verified failing without the fix
- [ ] Device matrix: 3 devices, 2 OS versions, 2 aspect ratios, one **low-end**
- [ ] Frame rate measured, not assumed
- [ ] Saves survive force-close and app update
- [ ] Accessibility: sound-off playable, hazards readable in greyscale, touch targets ≥44dp
- [ ] Permissions audited — delete every unused one
- [ ] Performance and cold-start acceptable on the cheapest target device

**Review:** external testers on their own hardware.

⛔ **Gate M5:** 48 hours of external testing, zero blocker reports.

### Sprint 5 — Release candidate → **M6**

**Goal:** submission-ready, nothing assumed.

- [ ] **Store spec sheet read first**, copied into a checklist: icon sizes, screenshot dimensions, target SDK, accepted formats
- [ ] Assets generated to those exact numbers
- [ ] Launcher icon replaced — not the same thing as the store icon
- [ ] Privacy policy live, URL returns 200, matches actual behaviour
- [ ] Third-party licences attributed
- [ ] Content rating and data-safety answers prepared
- [ ] Signing key generated and backed up in two places
- [ ] Localisation for the launch market
- [ ] Release build reproducible from a clean checkout; verified **by extracting the artifact**
- [ ] Staged rollout planned

**Review:** dry-run the whole submission before submitting for real.

⛔ **Gate M6:** every asset matches a requirement you have actually read.

### Sprint 6 — Launch & live → **M7**

- [ ] Submit; do not edit the listing during review
- [ ] Rejection playbook ready: read the cited policy, fix, bump, resubmit
- [ ] Crash and support monitoring daily for week one
- [ ] Measure against Sprint 0 success metrics
- [ ] First patch shipped within two weeks
- [ ] Retro on the whole project, written down

## 6 — Recurring per-sprint checklist

Run this every sprint regardless of phase:

- [ ] Sprint goal written in one sentence
- [ ] 3–5 stories pulled, all meeting Definition of Ready
- [ ] Riskiest item scheduled **first**, not last
- [ ] Daily log: did / doing / blocked
- [ ] Build installed on a real device at least once
- [ ] Someone other than you played it
- [ ] All merged work meets Definition of Done
- [ ] Tagged build produced by CI
- [ ] Retro written: 1 keep, 1 drop, 1 try
- [ ] Backlog re-ordered by risk before next planning

## 7 — Metrics

Track both, or you will optimise throughput while the game gets worse.

| Delivery health | Product health |
|---|---|
| Stories completed vs. committed | "Play again?" rate in playtests |
| Escaped defects (found after done) | Session length |
| CI pass rate on first attempt | D1 / D7 retention |
| Time from commit to installable build | Crash-free session rate |
| Rework ratio | Store rating and review themes |

**Leading indicator of trouble:** velocity rising while playtest enthusiasm falls.
You are building faster in the wrong direction.

## 8 — Anti-patterns

| Anti-pattern | Why it kills small games | Counter |
|---|---|---|
| Art before fun | Polish makes a bad game hard to abandon | Grey-box until Gate M2 |
| No non-goals | Scope creeps in through side doors | Write them; re-read them at every retro |
| Testing only on your own device | Your phone is the best one your players own | Low-end device in the matrix |
| Solo "review" | You cannot review your own build | Someone else plays it, every sprint |
| Big-bang release | Everything lands at once, including the bugs | Staged rollout |
| Assuming a spec | The most expensive habit in mobile | Read the spec before producing to it |
| Deferring the pipeline | Manual releases tax every future build | CI from commit #1 |
| Velocity as the goal | Measures motion, not progress | Pair it with a product metric |

---

## Applied to Pulse Streak, right now

The game is submitted, so it sits at **M7 pending review** — but it reached
there having skipped **M2 (first playable gate)** and **M5 (external beta)**
entirely. Nothing external validated it.

The highest-value next sprint is not engineering:

**Sprint goal:** *"Find out whether children actually enjoy Pulse Streak."*

- [ ] 5 children in the target age range play the installed app
- [ ] Watch without explaining the controls; note failures, smiles, quit points
- [ ] Ask each: "want to play again?"
- [ ] Record D1 anecdotally: do any ask for it the next day?
- [ ] Write the success metrics that were never defined
- [ ] Decide from that data: iterate, expand, or stop

That is a retroactive **Gate M2**, run late. Everything else — the game-over
panel, the shard cleanup, a Play submission — is lower value until it passes.
