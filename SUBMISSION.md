# Submitting Pulse Streak to the Indus Appstore

Everything buildable is done. What remains happens in the Indus developer
console, in a browser, and needs your identity — it cannot be scripted.

**Upload this file:**
[`pulse-streak-1.0.1-10001.aab`](https://github.com/venkyi21/pulse-streak/releases/tag/v1.0.1)
(3.15 MB, signed, verified)

> **A caveat worth reading.** I have not used the Indus console, and store UIs
> and rules change. Field *names* below may differ; the *values* are correct for
> this build. Where this file and the console disagree, the console wins —
> especially on the target-SDK requirement.

---

## Step 1 — Register as a developer

Go to the Indus Appstore developer console (`developer.indusappstore.com`) and
sign up. Expect to provide identity/KYC details and possibly a bank account if
you ever want paid apps — Pulse Streak is free, so payouts are irrelevant now.

Approval may take a day or two. Nothing else here can proceed until it lands.

## Step 2 — Check the target-SDK requirement *before* uploading

We ship **`targetSdk 35`**. Google's annual deadline falls on **31 August**, and
Indus generally tracks Android norms, so **36 may already be required.**

Find the current minimum in the console's developer docs. If it wants 36:

```bash
# android/variables.gradle
compileSdkVersion = 36
targetSdkVersion = 36
```

then:

```bash
npm version patch && npm run version:sync
git add -A && git commit -m "build: target SDK 36" && git push
git tag -a v1.0.2 -m "target SDK 36" && git push origin v1.0.2
```

CI hands you a new signed `.aab` in about two minutes. Doing this first avoids
an upload rejection and a wasted review cycle.

## Step 3 — Create the app

| Field | Value |
|---|---|
| App name | **Pulse Streak** |
| Package / application id | `com.pulsestreak.game` |
| Default language | English |
| App or game | **Game** |
| Category | Games → **Arcade** |
| Free or paid | **Free** |
| Contains ads | **No** |
| In-app purchases | **No** |

`com.pulsestreak.game` is **permanent** once uploaded. It cannot be changed
later — a different id is a different app, with no shared installs or ratings.

## Step 4 — Upload the build

Upload the **`.aab`**, not the `.apk`. The APK is only for sideloading during
testing; stores want the App Bundle.

If the console rejects the upload, the usual causes are:

| Symptom | Cause |
|---|---|
| "versionCode already exists" | You already uploaded 10001 — bump and re-tag |
| "targetSdk too low" | Step 2, do it properly |
| "not signed" / "debug signed" | Wrong artifact; use the one from the GitHub Release |

## Step 5 — Listing content

All the text is in [STORE-LISTING.md](STORE-LISTING.md) — paste it directly.

**Short description** (71 chars):
`One tap to hop the storks, grab shards, and keep your streak alive.`

**Full description** — see STORE-LISTING.md.

**Graphics**, all in [`store-assets/`](store-assets/):

| Console field | File |
|---|---|
| App icon | `icon-512.png` |
| Feature graphic / banner | `feature-graphic-1024x500.png` |
| Phone screenshots | `screenshot-1-play.png`, `-2-jump.png`, `-3-streak.png` |

If the console demands a different screenshot aspect ratio, don't crop them by
hand — say the word and `npm run assets` regenerates at whatever size it wants.

**URLs:**

- Privacy policy: `https://venkyi21.github.io/pulse-streak/privacy-policy.html`
- Website: `https://venkyi21.github.io/pulse-streak/`
- Support email: `svenkatramar21+pulsestreak@gmail.com`

## Step 6 — Content rating and data safety

Every answer is **no**. The full table is in
[STORE-LISTING.md](STORE-LISTING.md). The two that trip people up:

- **Loot boxes / gambling → No.** Trail colours unlock on a random roll, but
  they are cosmetic-only, cost nothing, and no currency is purchasable with
  money. That is not a loot box.
- **User-generated content → No.** The 3-letter high-score initials never leave
  the device and are shown to nobody else.

Target audience: **Everyone / suitable for children.**

## Step 7 — Submit, then wait

Review typically takes a few days. If it's rejected, the notice will cite a
specific policy — send me the text and I'll fix the build or the listing.

---

## After it goes live

- **Never lose `release.jks`.** Every future update must be signed with it.
- Ship updates with `npm version patch` → tag → upload the new `.aab`.
- Watch the support inbox; the address is on the public listing.
- If you ever add ads, purchases, analytics, or a server, the privacy policy and
  the data-safety declaration must be updated *before* that version ships, and
  the kids-audience rules in [DEPLOY.md](DEPLOY.md) come into force. Treat it as
  a separate project, not a tweak.
