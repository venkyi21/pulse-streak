'use strict';
/* ============================================================================
   Single source of truth for the app version: package.json "version".

   Everything else is derived, so the three places a version can drift are kept
   in lockstep automatically:

     package.json  1.2.3   ->  versionName  "1.2.3"   (what users see)
                             ->  versionCode  10203     (what the store orders by)
                             ->  APP_VERSION in index.html (what the menu shows)

   versionCode = major*10000 + minor*100 + patch. It must strictly increase on
   every upload or the store rejects the build, and it can never be lowered —
   so the formula is monotonic for any forward semver bump, and 1.2.3 -> 1.3.0
   (10203 -> 10300) stays ordered.

   Usage:
     node scripts/sync-version.js           write the derived values
     node scripts/sync-version.js --check   verify only, non-zero exit on drift
     node scripts/sync-version.js --expect-tag v1.2.3
   ========================================================================== */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PKG = path.join(ROOT, 'package.json');
const INDEX = path.join(ROOT, 'index.html');
const GRADLE = path.join(ROOT, 'android', 'app', 'build.gradle');

const args = process.argv.slice(2);
const CHECK_ONLY = args.includes('--check');
const expectTagIdx = args.indexOf('--expect-tag');
const EXPECT_TAG = expectTagIdx > -1 ? args[expectTagIdx + 1] : null;

const MAX = { minor: 100, patch: 100 };

function parseSemver(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
  if (!m) {
    throw new Error(`version "${v}" must be plain MAJOR.MINOR.PATCH (no pre-release suffix)`);
  }
  const [major, minor, patch] = m.slice(1).map(Number);
  if (minor >= MAX.minor || patch >= MAX.patch) {
    throw new Error(
      `version "${v}" overflows the versionCode formula (minor/patch must stay under 100)`
    );
  }
  return { major, minor, patch };
}

const versionCodeOf = ({ major, minor, patch }) => major * 10000 + minor * 100 + patch;

const problems = [];
const changes = [];

function reconcile(label, file, read, write, expected) {
  if (!fs.existsSync(file)) {
    console.log(`  - ${label}: not present yet (skipped)`);
    return;
  }
  const text = fs.readFileSync(file, 'utf8');
  const actual = read(text);
  if (actual === null) {
    problems.push(`${label}: could not find the value to update in ${path.relative(ROOT, file)}`);
    return;
  }
  if (String(actual) === String(expected)) {
    console.log(`  ✓ ${label}: ${expected}`);
    return;
  }
  if (CHECK_ONLY) {
    problems.push(`${label}: is ${actual}, expected ${expected}`);
    return;
  }
  fs.writeFileSync(file, write(text));
  changes.push(`${label}: ${actual} -> ${expected}`);
  console.log(`  ~ ${label}: ${actual} -> ${expected}`);
}

function main() {
  const pkg = JSON.parse(fs.readFileSync(PKG, 'utf8'));
  const semver = parseSemver(pkg.version);
  const versionName = pkg.version;
  const versionCode = versionCodeOf(semver);

  console.log(`${CHECK_ONLY ? 'Checking' : 'Syncing'} version ${versionName} (versionCode ${versionCode})`);

  if (EXPECT_TAG) {
    const want = EXPECT_TAG.replace(/^v/, '');
    if (want !== versionName) {
      problems.push(
        `git tag ${EXPECT_TAG} does not match package.json version ${versionName} — ` +
        'bump package.json and re-tag so the release is traceable'
      );
    } else {
      console.log(`  ✓ git tag ${EXPECT_TAG} matches package.json`);
    }
  }

  reconcile(
    'index.html APP_VERSION', INDEX,
    (t) => (/const APP_VERSION = '([^']+)'/.exec(t) || [null, null])[1],
    (t) => t.replace(/const APP_VERSION = '[^']*'/, `const APP_VERSION = '${versionName}'`),
    versionName
  );

  reconcile(
    'android versionName', GRADLE,
    (t) => (/versionName\s+"([^"]+)"/.exec(t) || [null, null])[1],
    (t) => t.replace(/versionName\s+"[^"]*"/, `versionName "${versionName}"`),
    versionName
  );

  reconcile(
    'android versionCode', GRADLE,
    (t) => (/versionCode\s+(\d+)/.exec(t) || [null, null])[1],
    (t) => t.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`),
    versionCode
  );

  // Machine-readable summary for CI (release notes, artifact naming).
  if (!CHECK_ONLY) {
    fs.writeFileSync(
      path.join(ROOT, 'version.json'),
      JSON.stringify({ versionName, versionCode, syncedAt: new Date().toISOString() }, null, 2) + '\n'
    );
  }

  if (problems.length) {
    console.error('\nVersion drift detected:');
    for (const p of problems) console.error(`  ✗ ${p}`);
    console.error(
      CHECK_ONLY ? '\nRun `npm run version:sync` to fix.\n' : '\nManual intervention needed.\n'
    );
    process.exit(1);
  }
  console.log(changes.length ? '\nVersion synced.' : '\nAll versions already in step.');
}

main();
