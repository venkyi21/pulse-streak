# Store listing copy

Ready-to-paste text for the Indus Appstore console (and Google Play, which uses
the same fields). Everything below is factually true of the shipped build —
please keep it that way, since listing claims are enforceable.

---

## Identity

| Field | Value |
|---|---|
| App name | **Pulse Streak** |
| Package id | `com.pulsestreak.game` |
| Version | 1.0.2 (versionCode 10002) |
| Category | Games → **Arcade** (Casual is an acceptable second choice) |
| Price | Free |
| In-app purchases | None |
| Ads | None |
| Privacy policy URL | `https://venkyi21.github.io/pulse-streak/privacy-policy.html` |
| Website | `https://venkyi21.github.io/pulse-streak/` |
| Contact email | `svenkatramar21+pulsestreak@gmail.com` |

## Short description

*80 characters max. This one is 71.*

```
One tap to hop the storks, grab shards, and keep your streak alive.
```

Alternates, if you want a different angle:

```
A tiny one-tap runner for kids. No ads, no tracking, works offline.
```
```
Tap to jump. Clear the storks. Beat your best. Free and fully offline.
```

## Full description

```
Pulse Streak is a bright, friendly one-tap runner you can pick up in a second.

Tap anywhere to hop your fluffy little runner over the crested storks. Grab the
blue shards as you go. Clear five in a row and the whole meadow speeds up —
how long can you keep the streak alive?

Made for kids and for anyone who likes a quick, cheerful game:

• ONE-TAP CONTROLS — tap anywhere to jump. That's the whole game.
• INSTANT RETRY — crashed? You're running again in one tap. No menus, no waiting.
• A MEADOW THAT SPEEDS UP — rolling hills, drifting clouds and a flower verge
  that races by faster the longer your streak lasts.
• COLLECT AND UPGRADE — spend shards on a higher jump, a wider shard magnet, or
  a guard pulse that soaks up one hit.
• UNLOCK TRAIL COLOURS — six sparkle colours to find and equip.
• DAILY STREAK — come back each day for a bigger bonus.
• LOCAL HIGH SCORES — a top-ten board kept on your own device.

WHAT'S NOT IN IT

No ads. No in-app purchases. No accounts or sign-ups. No analytics or tracking.
No internet connection required — or used. Pulse Streak works completely offline
and never sends anything anywhere. Everything you unlock is saved on your device
and stays there.

It's a small game, about 3 MB, and it starts instantly.
```

## "What's new" (release notes)

```
First release. Tap to jump, hop the storks, keep the streak going.
```

## Graphics to upload

All in [`store-assets/`](store-assets/), generated from the game's own artwork:

| File | Use |
|---|---|
| `icon-512.png` | App icon (512×512) |
| `feature-graphic-1024x500.png` | Feature graphic / banner |
| `screenshot-1-play.png` | Phone screenshot (1080×1920) |
| `screenshot-2-jump.png` | Phone screenshot |
| `screenshot-3-streak.png` | Phone screenshot |

> Most stores want **at least 2–4 phone screenshots**. Three are provided. If the
> console requires a 16:9 or specific aspect, tell me and I'll regenerate at that
> size — they are produced by `npm run assets`, not drawn by hand.

## Content rating questionnaire

Expected answers for the shipped build. Answer honestly against the build you
actually upload:

| Question | Answer |
|---|---|
| Violence (realistic, fantasy, or cartoon) | **No** — the runner is never harmed; a hit ends the run |
| Blood or gore | No |
| Sexual or suggestive content | No |
| Profanity or crude humour | No |
| Alcohol, tobacco, drugs | No |
| Gambling, simulated gambling, or loot boxes | **No.** Trail colours unlock on a random roll after a run, but they are purely cosmetic, cost nothing, and involve no currency purchasable with money |
| Horror or frightening content | No |
| User-generated content or user-to-user communication | **No** — the high-score initials are stored locally and shown only to you |
| Shares user location | No |
| Allows purchases | No |
| Contains ads | No |
| Collects personal information | **No** |
| Target age group | **Everyone / suitable for children** |

## Data safety / privacy declaration

If the console asks for a data-safety form, the answer to every collection and
sharing question is **No**:

- Data collected: **none**
- Data shared with third parties: **none**
- Data encrypted in transit: **N/A — no data is transmitted**
- Users can request deletion: **N/A — no data is held; uninstalling clears local saves**

---

## Prerequisites — both done

- [x] **Contact email** — `svenkatramar21+pulsestreak@gmail.com`, a plus-alias so
      app mail can be filtered and any leak is traceable. Set in this file and in
      [`docs/privacy-policy.html`](docs/privacy-policy.html).
- [x] **Privacy policy published** — live and returning HTTP 200 at
      <https://venkyi21.github.io/pulse-streak/privacy-policy.html>, served over
      HTTPS with `http://` redirecting. Verified, not assumed.

## Still to do before you submit

1. **Check the console's current `targetSdk` minimum.** We ship 35. The annual
   deadline falls on 31 August, so 36 may already be required — verify against
   the console rather than trusting this file.
2. **Upload `pulse-streak-1.0.2-10002.aab`** from the
   [v1.0.2 release](https://github.com/venkyi21/pulse-streak/releases/tag/v1.0.2).
   That is the build with the real launcher icons — earlier builds shipped the
   stock Capacitor logo.

Device testing is done: v1.0.1 was installed and played on a real Android phone.
