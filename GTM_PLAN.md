# Pulse Streak — Go-to-Market Plan

*Prepared July 30, 2026*

## Positioning

Pulse Streak leans into the one mechanic 2026 retention research keeps pointing to: reward loops built from daily bonuses, milestones, and streaks are the single biggest lever for anchoring player habit ([Segwise, 2026](https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies)). Most hyper-casual runners bury that behind generic "come back tomorrow" nagging; Pulse Streak makes the streak itself the core dopamine loop — in-run (consecutive obstacle clears escalate speed, flash, and pitch) and out-of-run (a 7-day login calendar with an escalating payout). The player who churns off a typical endless runner after one bad run is the target: someone who needs the *next* run to visibly build on the last one, not reset to zero.

**One-line pitch:** One tap. One streak. Don't break the chain.
**Target player:** Casual mobile/web players who like Flappy Bird-style skill loops but bounce off games that don't visibly reward consistency — the "daily streak" crowd more than the "leaderboard grinder" crowd.

## Store / listing copy

- **Title:** Pulse Streak
- **Subtitle:** One-tap neon runner. Keep the streak alive.
- **Short description:** Tap to jump, clear pink spikes, and chain streaks for escalating speed and color-shift juice. Upgrade your run with shards, unlock trail colors, and keep your daily streak calendar alive for bigger payouts.
- **Keywords/tags:** one-tap, endless runner, streak, hyper-casual, arcade, neon, skill game
- **Screenshot callouts:** the streak-multiplier flash at x5/x10 with the speed readout on screen; the shop panel mid-purchase (Jump Boost/Shard Magnet/Guard Pulse); the 7-day login-streak pip row on the menu; the Top-10 local leaderboard with initials entry.

## Launch channels (Day 0, free/open only)

- **itch.io** — tag as `endless-runner`, `one-button`, `hyper-casual`, `html5`; itch's HTML5 embed works directly since the build is a single self-contained page.
- **r/WebGames** and **r/incremental_games** (for the meta-progression/shop angle) — both accept direct playable HTML5 links.
- **Show HN** ("Show HN: Pulse Streak — a one-tap runner built with Phaser") — HN's dev audience responds well to "built in a day, MIT-licensed, no backend" framing, which this build can honestly claim.
- **Indie dev Discords** (e.g. r/gamedev's Discord, Phaser's own Discord) — Phaser-specific communities are a natural fit since the build is a clean example of the engine's 3.60+ particle API.
- **X/Bluesky #indiedev, #hypercasual, #phaserjs** — post the streak-flash moment as a short clip; that's the single most "juicy" visual the game has.

## First-week content calendar

| Day | Action |
|---|---|
| 0 | Publish to itch.io + GitHub Pages; post to r/WebGames and Show HN with the streak-flash clip. |
| 1 | Post in Phaser Discord focused on the technical build (procedural textures, no assets, MIT-only stack) — different angle than the player-facing Day 0 posts. |
| 2 | Share the shop/meta-progression screenshot on X/Bluesky — appeal to players who bounced off the game before finishing a full loop. |
| 3 | Reply to Day 0/1 comment threads with a changelog if any balance tweaks came out of early feedback (e.g. spike spacing, jump timing). |
| 4 | Post the 7-day login-streak pip UI specifically — flag it as "day 4 of testing my own streak feature" for authenticity. |
| 5–7 | Round up any Top-10 leaderboard screenshots players share; re-share with credit. Post a short "what's next" note (e.g. a real backend leaderboard) to keep the thread active into week 2. |

## Metrics to track

Grounded in the actual 2026 benchmarks pulled in research: overall mobile D1 retention of roughly 27%, D7 of 8–14%, D30 of 3–7% is the general bar ([Segwise, 2026](https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies)); hyper-casual specifically runs far below that on D30 (around 1.38%), while hybrid-casual titles with a real meta-progression loop hit roughly 16% D7 ([Segwise, 2026](https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies)). Since Pulse Streak is built with a hybrid-casual meta-loop (shop + streak calendar) rather than a bare hyper-casual loop, the 16% D7 hybrid-casual figure — not the 1.38% hyper-casual D30 figure — is the realistic comparison target once real distribution exists.

At minimum, track: D1/D7 retention against the ~27% / ~10–16% benchmarks above; runs-per-session; percentage of sessions that reach a streak flash (x5 or higher) — this is the core "juice" moment and a direct proxy for whether the core loop lands; soft-fail/revive click-through rate on the simulated "watch ad" button (signals real demand before any ad SDK is integrated); daily-login-streak claim rate and day-7 completion rate (validates the habit-loop bet this whole positioning rests on); and shop-purchase rate as a proxy for whether the meta-progression loop is pulling players back for a second run.

## Regulatory / ethical note

The only chance-based system in Pulse Streak is the cosmetic trail-color drop (20% chance per run, non-gameplay-affecting, no real-money purchase path). Given 2026 regulatory pressure on gacha/loot-box mechanics — outright bans in Belgium and the Netherlands, and UK ASA disclosure requirements for loot-box odds in advertising ([Salivity, 2026](https://salivity.github.io/game-development/article/psychology-of-gacha-monetization-in-mobile-games)) — this build stays on the safe side by design: cosmetic-only, no real-money pulls, and the odds are stated plainly in this document and the README. If a real launch wanted to monetize this loop directly (e.g. paid gacha pulls), that's a materially bigger scope and legal-review decision, not something to default into.

## What "GTM complete" means for this scope

Produced and real: the store/listing copy above, the channel list, the 7-day content calendar, the metrics list tied to dated 2026 benchmarks, and a fully playable, self-contained HTML5 build ready for itch.io or GitHub Pages. Explicitly out of scope for this same-day build: any paid user-acquisition spend, a real ad-network integration (the energy-gate and revive flows are simulated countdowns, not real rewarded video), and a real cross-device backend leaderboard (currently `localStorage`-only, per-browser). Actually executing the channel posts, authenticating a `gh` CLI session to publish to GitHub Pages, and a hands-on browser playtest are all still the user's own next steps.

## Sources

- [Mobile Game Retention Benchmarks 2026: Is Your D1 Above 27%?](https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies)
- [Psychology of Gacha Monetization in Mobile Games](https://salivity.github.io/game-development/article/psychology-of-gacha-monetization-in-mobile-games)
