'use strict';
/* ============================================================================
   Applies the three release-critical edits to the Android project Capacitor
   generates. Run once after `npx cap add android` (npm run android:add does it
   for you); safe to re-run — every edit is idempotent.

     1. Portrait lock          — the game is a fixed 480x800 portrait canvas.
     2. Release signing config — reads keystore.properties locally, or env vars
                                 in CI, so no secret is ever written to git.
     3. Cleartext traffic off  — the app is fully offline and must stay that way.

   If Capacitor changes its templates and an anchor cannot be found, this fails
   loudly with the manual equivalent rather than silently producing an unsigned
   or landscape-capable build. See DEPLOY.md.
   ========================================================================== */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ANDROID = path.join(ROOT, 'android');
const MANIFEST = path.join(ANDROID, 'app', 'src', 'main', 'AndroidManifest.xml');
const GRADLE = path.join(ANDROID, 'app', 'build.gradle');

const SIGNING_PREAMBLE = `// --- release signing (added by scripts/patch-android.js) ---
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
def psStoreFile = System.getenv("PS_KEYSTORE_PATH") ?: keystoreProperties['storeFile']
def psStorePassword = System.getenv("PS_KEYSTORE_PASSWORD") ?: keystoreProperties['storePassword']
def psKeyAlias = System.getenv("PS_KEY_ALIAS") ?: keystoreProperties['keyAlias']
def psKeyPassword = System.getenv("PS_KEY_PASSWORD") ?: keystoreProperties['keyPassword']
// --- end release signing ---
`;

const SIGNING_CONFIGS = `
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
`;

const failures = [];
const done = [];

function requireProject() {
  if (!fs.existsSync(ANDROID)) {
    console.error(
      'No android/ directory found.\n' +
      'Run this first:\n\n  npm install\n  npm run android:add\n'
    );
    process.exit(1);
  }
}

function patch(file, label, apply) {
  if (!fs.existsSync(file)) {
    failures.push(`${label}: ${path.relative(ROOT, file)} not found`);
    return;
  }
  const before = fs.readFileSync(file, 'utf8');
  let after;
  try {
    after = apply(before);
  } catch (e) {
    failures.push(`${label}: ${e.message}`);
    return;
  }
  if (after === null) {
    console.log(`  = ${label}: already applied`);
    return;
  }
  fs.writeFileSync(file, after);
  done.push(label);
  console.log(`  + ${label}: applied`);
}

requireProject();
console.log('Patching the generated Android project...');

// 1 ------------------------------------------------------------- portrait ---
patch(MANIFEST, 'portrait lock', (xml) => {
  if (/android:screenOrientation="portrait"/.test(xml)) return null;
  const activity = /<activity\b[^>]*android:name="[^"]*MainActivity"/.exec(xml);
  if (!activity) throw new Error('could not find the MainActivity <activity> tag');
  return xml.replace(
    activity[0],
    `${activity[0]}\n            android:screenOrientation="portrait"`
  );
});

// 2 -------------------------------------------------------------- signing ---
patch(GRADLE, 'signing config', (gradle) => {
  if (gradle.includes('added by scripts/patch-android.js')) return null;
  if (!/^android \{/m.test(gradle)) throw new Error('could not find the top-level `android {` block');
  if (!/buildTypes \{\s*\n\s*release \{/.test(gradle)) {
    throw new Error('could not find `buildTypes { release {`');
  }
  return gradle
    .replace(/^android \{/m, `${SIGNING_PREAMBLE}\nandroid {${SIGNING_CONFIGS}`)
    .replace(
      /(buildTypes \{\s*\n\s*release \{)/,
      '$1\n            if (psStoreFile) { signingConfig signingConfigs.release }'
    );
});

// 3 ------------------------------------------------- no cleartext traffic ---
patch(MANIFEST, 'cleartext traffic disabled', (xml) => {
  if (/android:usesCleartextTraffic="false"/.test(xml)) return null;
  if (/android:usesCleartextTraffic="true"/.test(xml)) {
    return xml.replace('android:usesCleartextTraffic="true"', 'android:usesCleartextTraffic="false"');
  }
  const app = /<application\b[^>]*/.exec(xml);
  if (!app) throw new Error('could not find the <application> tag');
  return xml.replace(app[0], `${app[0]}\n        android:usesCleartextTraffic="false"`);
});

if (failures.length) {
  console.error('\nSome patches could not be applied automatically:');
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error('\nApply the equivalent by hand — see the "If the patcher fails" section of DEPLOY.md.\n');
  process.exit(1);
}
console.log(done.length ? '\nAndroid project patched.' : '\nAndroid project already up to date.');
