# What's left, in order

A sequenced checklist for getting Pulse Streak from "works on my machine" to
"live on the Indus Appstore". [DEPLOY.md](DEPLOY.md) is the reference manual;
this is the running order. Tick as you go.

**Done already:** game + art, 147 passing tests, local git repo with `v1.0.0`,
Capacitor config, version tooling, CI/release workflows, store graphics.

---

## Phase 1 — Get it on GitHub  ·  ~5 min

- [ ] **1.1** Authenticate (opens a browser, paste the one-time code):
      ```bash
      gh auth login --hostname github.com --git-protocol https --web
      ```
- [ ] **1.2** Create the repo and push:
      ```bash
      cd "C:\Users\vnktr\Documents\AI_Solopreneurs\Apps\Games\pulse-streak"
      gh repo create pulse-streak --public --source=. --remote=origin --push
      ```
- [ ] **1.3** Confirm the CI badge goes green under the repo's **Actions** tab.
      It runs 147 tests, the boot check, version consistency, and asset freshness.

> Do **not** push the `v1.0.0` tag yet — the release build needs Phase 2 first.

## Phase 2 — Android build environment  ·  ~45 min, one-time

- [ ] **2.1** Install **Android Studio** (ships the Android SDK and a bundled
      JDK): https://developer.android.com/studio
- [ ] **2.2** Open it once and let the SDK Manager finish downloading
      platform-tools + the current SDK platform. Accept the licences.
- [ ] **2.3** Confirm Java is 21+: `java -version`. If not, install Temurin 21.
- [ ] **2.4** Install dependencies and scaffold the native project:
      ```bash
      npm install
      npm run android:add
      ```
      This builds `www/`, runs `npx cap add android`, and auto-applies the
      portrait lock, signing config, and cleartext-off patches.
- [ ] **2.5** Commit the generated project — **CI cannot build without it**:
      ```bash
      git add android && git commit -m "chore: add android platform" && git push
      ```

## Phase 3 — Signing keystore  ·  ~15 min, do it carefully

- [ ] **3.1** Generate it:
      ```bash
      keytool -genkeypair -v -keystore release.jks -keyalg RSA -keysize 4096 \
        -validity 10000 -alias pulse-streak
      ```
- [ ] **3.2** **Back up `release.jks` and its passwords in two places** (password
      manager + an offline copy). Lose this file and you can never update the
      published app — you would need a new package id and would abandon every
      install and rating. It is gitignored; a test enforces that.
- [ ] **3.3** For local builds, create `android/keystore.properties` (gitignored):
      ```properties
      storeFile=../release.jks
      storePassword=…
      keyAlias=pulse-streak
      keyPassword=…
      ```
- [ ] **3.4** Add the four GitHub secrets so CI can sign. In PowerShell:
      ```powershell
      [Convert]::ToBase64String([IO.File]::ReadAllBytes("release.jks")) |
        Out-File keystore.b64 -Encoding ascii -NoNewline
      Get-Content keystore.b64 -Raw | gh secret set KEYSTORE_BASE64
      gh secret set KEYSTORE_PASSWORD
      gh secret set KEY_ALIAS
      gh secret set KEY_PASSWORD
      Remove-Item keystore.b64
      ```

## Phase 4 — Play it on a real phone  ·  ~30 min  ·  **the important one**

Nothing has ever run on real hardware. The tests use a fake Phaser, so they say
nothing about touch, rendering, or performance on a device.

- [ ] **4.1** Build an installable APK:
      ```bash
      npm run android:apk
      ```
      Output: `android/app/build/outputs/apk/release/`
- [ ] **4.2** Copy it to an Android phone (USB or Drive), tap it, allow
      "install from unknown sources".
- [ ] **4.3** Check each of these and tell me anything that's off:
  - [ ] Tap anywhere makes the critter jump, with no input lag
  - [ ] The jump window feels fair — you can clear a stork consistently
  - [ ] Locked to portrait; rotating the phone does nothing
  - [ ] Smooth frame rate; the parallax doesn't stutter
  - [ ] Shards, best score, and upgrades **survive force-closing the app**
  - [ ] The shop, trail colours, and login streak all work by touch
  - [ ] Sound plays (Web Audio can need a first touch to unlock on mobile)

## Phase 5 — Cut the release build  ·  ~10 min

- [ ] **5.1** Preflight: `npm run release:preflight`
- [ ] **5.2** Push the tag to trigger a signed build:
      ```bash
      git push origin v1.0.0
      ```
- [ ] **5.3** Download `pulse-streak-1.0.0-10000.aab` from the GitHub **Releases**
      page. (For later versions: `npm version patch` → `npm run version:sync` →
      commit → `git push && git push --tags`.)

## Phase 6 — Indus Appstore submission  ·  varies

- [ ] **6.1** Register a developer account at the Indus Appstore developer console.
- [ ] **6.2** **Write and host a privacy policy.** Yours is unusually simple —
      no data collection, no ads, no analytics, no network, saves stay on the
      device. GitHub Pages can host it free from this repo. *Ask me and I'll
      draft it.*
- [ ] **6.3** Create the app listing:
  - Package id `com.pulsestreak.game` (**permanent** once uploaded)
  - Name: Pulse Streak
  - Category: Games → Arcade or Casual
  - Graphics: everything in [`store-assets/`](store-assets/)
  - Short + full description (*ask me and I'll draft these*)
- [ ] **6.4** Complete the content rating questionnaire. Answer honestly — and
      it's all "no": no ads, no purchases, no user content, no data collection.
- [ ] **6.5** Set the target age group. This is a kids' title, so expect extra
      scrutiny under India's DPDP Act 2023. The app is in the safest possible
      position today; see the kids-audience note in DEPLOY.md before you ever
      add ads, IAP, or a server.
- [ ] **6.6** Upload the `.aab` and submit for review.
- [ ] **6.7** Verify the console's **current** target-SDK minimum and asset
      requirements against its own docs. My knowledge has a May 2026 cutoff and
      store rules change.

---

## Still open on the product side

| Item | Status |
|---|---|
| Real-device playtest | **Never done.** Phase 4. The biggest unknown. |
| Menu still on the old dark neon theme | Visibly inconsistent with the bright in-game meadow. Ask and I'll re-skin it. |
| Uncollected shards are never swept off-screen | Documented, harmless at current volumes (`known gap:` in `integration/game-run`). |
| Google Play | The same `.aab` works. Play also has a publishing API, so that upload can be automated later. |

## Things only you can do

Authenticating GitHub, generating and safekeeping the keystore, registering as a
developer, and testing on hardware. Everything else in this repo is automated or
already written.
