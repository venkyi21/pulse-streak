# Project status

Pulse Streak, from "works on my machine" to live on the Indus Appstore.
[DEPLOY.md](DEPLOY.md) is the build/release reference, [SUBMISSION.md](SUBMISSION.md)
is the store walkthrough. This file is the running status.

**Submitted to the Indus Appstore on 1 Aug 2026 — v1.0.3 (versionCode 10003),
status: In Review.**

Built, signed, verified on a real Android phone, and uploaded. Nothing further
to do until the review completes.

---

## Done

| Phase | |
|---|---|
| **1. GitHub** | Repo public at [venkyi21/pulse-streak](https://github.com/venkyi21/pulse-streak), CI green on every push |
| **2. Android toolchain** | Capacitor 7.6.8, `android/` committed, patched for portrait + signing + zero permissions. Android Studio turned out to be unnecessary — CI builds it |
| **3. Keystore** | 4096-bit RSA, PKCS#12, valid to Dec 2053, cert `2E:2E:F9:1D…B9:85`. Four signing secrets configured |
| **4. Real-device test** | v1.0.1 installed and played on an Android phone. Confirms the WebView, touch input, and the INTERNET-permission removal |
| **5. Release pipeline** | Tag `v*` → tests → signed `.aab` + `.apk` → GitHub Release. Two releases cut so far |
| **Privacy policy** | Live at [venkyi21.github.io/pulse-streak/privacy-policy.html](https://venkyi21.github.io/pulse-streak/privacy-policy.html) |
| **Store assets** | Icon, adaptive icon, feature graphic, 3 screenshots — generated from the game's own art |
| **Listing copy** | Descriptions, rating answers, data-safety answers in [STORE-LISTING.md](STORE-LISTING.md) |

149 tests, zero dependencies to install.

## Submission — done

- [x] Indus developer account registered
- [x] Target-SDK requirement confirmed: the console wants **34 or higher**, we ship **35**
- [x] App created as `com.pulsestreak.game`, build uploaded
- [x] Listing copy, graphics, privacy policy URL and support details filled in
- [x] Content-rating and data-safety forms completed — every answer "no"
- [x] Submitted, **In Review** since 1 Aug 2026

### Two things learned at the upload step

- **v1.0.2 never built.** Generated launcher icons broke `aapt2` at the Gradle
  step even though the PNGs verified clean structurally. Fixed in v1.0.3 by
  re-encoding them through libpng, which took the hand-rolled PNG encoder out of
  the Android build path.
- **An AAB upload asks for your keystore**, because the store has to sign the
  APKs it generates. Uploading an **APK** instead avoids handing over the private
  key, and costs nothing here: the app has no native libraries, one language, and
  procedural art, so a bundle offers no split it could optimise.

### While waiting

Do not resubmit or create a second listing — duplicates slow reviews down. If it
is rejected the notice cites a specific policy: fix it, `npm version patch`, tag,
and upload the new signed build.

## Known gaps, none blocking

| Item | Note |
|---|---|
| Uncollected shards are never swept off-screen | Documented in `integration/game-run`. Harmless at current volumes |
| Game-over panel is still dark | Deliberate contrast against the bright playfield; looks intentional rather than inconsistent |
| Google Play not submitted | The same `.aab` works. Play also has a publishing API, so that upload could be automated |
| No crash reporting | By design — it would mean collecting data and rewriting the privacy story |

## Shipping an update later

```bash
npm version patch          # or minor / major
npm run version:sync
git add -A && git commit -m "..." && git push
git tag -a v1.0.2 -m "..." && git push origin v1.0.2
```

CI produces the signed `.aab`; upload it to the console. `versionCode` must
always increase — the sync script guarantees that from the semver.
