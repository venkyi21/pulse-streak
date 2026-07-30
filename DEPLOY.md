# Deploying Pulse Streak to the Indus Appstore

The game is a web build. Indus Appstore (and Google Play) distribute **Android
packages**, so the web build gets wrapped in a thin native shell with
[Capacitor](https://capacitorjs.com). The game itself is untouched — it runs in
a system WebView with no network access, exactly as it does in a browser.

```
index.html + phaser.min.js  →  www/  →  Capacitor  →  Android app  →  signed .aab  →  store
```

| Fact | Value |
|---|---|
| Package id (**permanent** after first upload) | `com.pulsestreak.game` |
| Display name | Pulse Streak |
| Network permission | none — the app is fully offline |
| Data collected | none. Saves live in the WebView's `localStorage`, on-device only |
| Ads / analytics SDKs | none |
| Same artifact works on | Indus Appstore and Google Play |

---

## 1. One-time local setup

Requires **Node 20+**, a **JDK 21**, and the **Android SDK** (easiest via
Android Studio).

```bash
npm install                 # Capacitor
npm run android:add         # builds www/, creates android/, applies patches
git add android && git commit -m "chore: add android platform"
```

`android:add` runs `scripts/patch-android.js`, which applies three
release-critical edits to the generated project:

1. **Portrait lock** — the game is a fixed 480×800 portrait canvas.
2. **Release signing config** — reads `keystore.properties` locally, or
   `PS_*` env vars in CI, so no secret is ever written to git.
3. **Cleartext traffic disabled** — the app is offline and must stay that way.

The `android/` folder **must be committed**, or CI has nothing to build.

## 2. Create your keystore — then protect it

```bash
keytool -genkeypair -v -keystore release.jks -keyalg RSA -keysize 4096 \
  -validity 10000 -alias pulse-streak
```

> **This file is the identity of your app.** Lose it and you can never publish an
> update — you would have to ship a new package id and abandon every existing
> install and rating. Leak it and someone else can sign builds as you.
>
> Back it up somewhere durable (password manager + offline copy). It is
> `.gitignore`d, and a test asserts that it stays that way.

For local release builds, create `android/keystore.properties` (also gitignored):

```properties
storeFile=../release.jks
storePassword=…
keyAlias=pulse-streak
keyPassword=…
```

## 3. Versioning

`package.json` `"version"` is the single source of truth. Everything else is
derived by `npm run version:sync`:

| Derived value | From `1.2.3` | Purpose |
|---|---|---|
| `versionName` | `"1.2.3"` | what users and the listing show |
| `versionCode` | `10203` | integer the store orders builds by — **must always increase** |
| `APP_VERSION` in `index.html` | `1.2.3` | printed in the menu footer, so you can identify any build a player reports |

Formula: `major×10000 + minor×100 + patch`. Minor and patch must stay under 100.
`npm run version:check` fails the build on any drift, and a unit test asserts the
game and `package.json` agree.

## 4. Cut a release

```bash
npm version patch            # or minor / major — bumps package.json + commits + tags
npm run version:sync
git push && git push --tags
```

The tag push triggers `.github/workflows/release.yml`, which:

1. runs the full test suite and the boot check — **a failing suite blocks the release**
2. verifies the git tag matches `package.json`
3. builds `www/`, syncs Capacitor, re-applies the Android patches
4. decodes the keystore from secrets and builds a signed `.aab` + `.apk`
5. attaches both to a GitHub Release, named `pulse-streak-<version>-<code>.aab`
6. deletes the keystore from the runner

### Required GitHub secrets

| Secret | Value |
|---|---|
| `KEYSTORE_BASE64` | `base64 -w0 release.jks` (macOS: `base64 -i release.jks`) |
| `KEYSTORE_PASSWORD` | keystore password |
| `KEY_ALIAS` | e.g. `pulse-streak` |
| `KEY_PASSWORD` | key password |

Prefer building locally? `npm run android:bundle` produces the same `.aab` at
`android/app/build/outputs/bundle/release/`.

## 5. Upload to Indus Appstore

Registration and submission happen in the Indus Appstore developer console.
**Upload is manual** — this pipeline stops at a signed, versioned artifact. I
have not wired an automated store upload because I could not verify that Indus
exposes a publishing API; if they do, it slots in after the build step. (Google
Play does have one, via the Play Developer API or fastlane, if you add Play
later.)

Listing graphics are pre-generated in `store-assets/` by `npm run assets`, from
the game's own procedural art:

| File | Use |
|---|---|
| `icon-512.png` | listing icon |
| `icon-adaptive-fg-432.png` / `-bg-432.png` | Android adaptive launcher icon |
| `feature-graphic-1024x500.png` | store banner |
| `screenshot-1-play.png`, `-2-jump.png`, `-3-streak.png` | 1080×1800 phone screenshots |

### Listing copy you still need to write

- Short and full description
- Category (Games → Arcade or Casual) and a content rating questionnaire
- **Privacy policy URL.** Stores generally require one even when nothing is
  collected. Yours is short and honest: no data collection, no ads, no analytics,
  no network access; saves are local to the device.
- Target age group

## 6. Before you submit — checked, not assumed

- [ ] `npm run release:preflight` is green
- [ ] Installed the release `.aab`/`.apk` on a **real phone** and played it —
      touch input, portrait lock, that saves survive an app restart
- [ ] Keystore backed up in two places
- [ ] Confirm the console's **current** `targetSdk` minimum and asset
      requirements. My knowledge has a cutoff and store rules change — verify
      these against the live console rather than trusting this document
- [ ] Content rating answered honestly: no ads, no purchases, no user-generated
      content, no data collection

### Kids-audience note

This is a children's title, which brings extra obligations under India's DPDP
Act 2023 and family policies on both stores. Right now the app is in the
simplest possible position: **no ads, no analytics, no network, no accounts, no
data leaving the device.** The former "watch ad" buttons were fake countdowns
that always paid out; they were relabelled (`CONTINUE (free)`, and an honest
"next heart in Ns" message) rather than shipped as theatre. A test asserts no ad
copy or ad SDK can return without being noticed.

If you later add real ads, IAP, or a global leaderboard, that changes: you take
on verifiable parental consent, a real privacy policy, ad-content restrictions
for children, and a backend to secure. Treat it as a separate project with its
own review, not an incremental tweak.

---

## If the patcher fails

`scripts/patch-android.js` edits Capacitor's generated files by matching known
anchors. If Capacitor changes its templates the script **fails loudly** rather
than producing a landscape-capable or unsigned build. Apply the equivalent by
hand:

**`android/app/src/main/AndroidManifest.xml`** — on the `MainActivity` activity:

```xml
android:screenOrientation="portrait"
```

and on `<application>`:

```xml
android:usesCleartextTraffic="false"
```

**`android/app/build.gradle`** — above `android {`:

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
def psStoreFile = System.getenv("PS_KEYSTORE_PATH") ?: keystoreProperties['storeFile']
def psStorePassword = System.getenv("PS_KEYSTORE_PASSWORD") ?: keystoreProperties['storePassword']
def psKeyAlias = System.getenv("PS_KEY_ALIAS") ?: keystoreProperties['keyAlias']
def psKeyPassword = System.getenv("PS_KEY_PASSWORD") ?: keystoreProperties['keyPassword']
```

inside `android { }`:

```gradle
    signingConfigs {
        release {
            if (psStoreFile) {
                storeFile file(psStoreFile)
                storePassword psStorePassword
                keyAlias psKeyAlias
                keyPassword psKeyPassword
            }
        }
    }
```

and inside `buildTypes { release { … } }`:

```gradle
            if (psStoreFile) { signingConfig signingConfigs.release }
```

## Why no Docker

There is nothing to containerize. The game has no backend, and an Android build
needs a JDK plus the Android SDK — both preinstalled on GitHub's runners. A
Docker Android image would add a slow, heavy layer for no reproducibility gain
at this size. The one thing that would change the answer: adding a real service
(a global leaderboard API), which you would containerize — the game itself still
would not be.
