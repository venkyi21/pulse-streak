# Kickoff prompts — how to start a session

Copy-paste starting points for working on a game with an AI coding agent.
Replace every `⟨placeholder⟩`.

The pattern that matters: **point at the blueprint, state the constraints, name
the gate you're working toward.** Without that, a session drifts into building
features nobody asked for.

---

## A. Brand new game — Sprint 0

Paste this as your first message in a fresh project folder.

```
I'm building a new mobile game. Run it as Sprint 0 of the blueprint at
templates/NEW-GAME-BLUEPRINT.md (copy it in from my pulse-streak repo if it
isn't here yet).

THE GAME
- Working title: ⟨name⟩
- Idea in one line: ⟨pitch⟩
- Target player: ⟨who, and roughly what age⟩
- Core mechanic: ⟨one verb⟩
- Art benchmark: ⟨a real shipped product⟩
- Platform: ⟨Android portrait, phone⟩
- Launch market: ⟨India — Indus Appstore first, Play later⟩
- Monetisation: ⟨none for v1⟩

CONSTRAINTS
- ⟨single HTML file / Phaser 3 vendored / no CDN / works offline⟩
- Minimum device: ⟨cheapest phone I'll support⟩
- No analytics or ad SDKs without asking me first

SPRINT 0 ONLY. Do these, in this order, and stop at the gate:
1. Repo, .gitignore, CI on push, toolchain version pinned in CI and engines
2. Help me fill in the project card, including success metrics and kill criteria
3. Draft the PRD - scope, NON-GOALS, testable acceptance criteria per feature
4. Seed the backlog as epics -> stories, ordered by risk not comfort

Do NOT write game code yet. Ask me the questions you need answered rather than
guessing. Stop at Gate M1 and tell me whether it passes.
```

## B. Each following sprint

```
Sprint ⟨n⟩ of templates/NEW-GAME-BLUEPRINT.md. Milestone ⟨M2 First playable⟩.

Sprint goal: ⟨one sentence⟩

Committed stories:
- ⟨story⟩ - acceptance: ⟨testable⟩
- ⟨story⟩ - acceptance: ⟨testable⟩

Rules for this sprint:
- Definition of Done includes: test written, CI green, runs on a real device
- Riskiest item first
- End with a tagged build I can install
- Flag anything that would breach the PRD non-goals instead of just doing it

At the end, give me the gate verdict and a retro: 1 keep, 1 drop, 1 try.
```

## C. Continuing Pulse Streak

```
Continuing Pulse Streak. Read NEXT-STEPS.md and BENCHMARK.md first for current
state - it's submitted to the Indus Appstore, v1.0.3, awaiting review.

Today I want to: ⟨…⟩

Keep to the existing conventions: 149 tests must stay green, version bumps go
through npm version + version:sync, releases are tag-driven.
```

## D. When the review result lands

**Approved:**
```
Pulse Streak was approved and is live on the Indus Appstore. Help me:
1. Verify the live listing looks right
2. Set up the first-week monitoring routine
3. Plan v1.1 from BENCHMARK.md's priority gaps
```

**Rejected:**
```
Pulse Streak was rejected. Here is the exact notice:

⟨paste the full text⟩

Diagnose it, fix the build or the listing, and produce a new signed version.
```

## E. Playtest sprint — the one Pulse Streak skipped

```
I'm running the fun gate on ⟨game⟩ retroactively. Help me:
1. Write a 15-minute playtest script for ⟨5 children aged 6-10⟩ - what to say,
   what NOT to say, what to record
2. Build an observation sheet I can fill in per tester
3. Afterwards, help me read the results honestly and decide: iterate or stop
```

---

## What makes these work

| Element | Why |
|---|---|
| Points at the blueprint file | The agent reads the process instead of inventing one |
| States constraints up front | Prevents dependencies, SDKs and scope you didn't want |
| Names one sprint and one gate | Bounds the session; stops drift into unrequested features |
| "Ask me rather than guessing" | Surfaces assumptions while they're still cheap |
| Demands a device build | Keeps "done" honest |

## Two things worth adding to a new project

**A `CLAUDE.md` in the repo root.** Any agent session reads it automatically, so
you stop re-explaining the project. Keep it short:

```markdown
# ⟨Game⟩
⟨One-line pitch⟩. ⟨Platform⟩.

## Commands
npm test          # ⟨n⟩ tests, zero dependencies
npm run check     # boots the game headlessly

## Conventions
- ⟨Single HTML file; no bundler; no CDN⟩
- Version: bump package.json, then npm run version:sync
- Releases are tag-driven: git tag vX.Y.Z && git push origin vX.Y.Z
- No new dependencies, ad SDKs or analytics without asking

## Current state
⟨status⟩ - see NEXT-STEPS.md
```

**Copy the starter kit** listed at the bottom of
[NEW-GAME-BLUEPRINT.md](NEW-GAME-BLUEPRINT.md) — the CI workflows, gitignore,
version sync and Android patch scripts are already proven green. That turns
Sprint 0 Day 1 from a day into about an hour.
