'use strict';
/* ============================================================================
   Probes every live endpoint and the CI/release state, then rewrites the STATUS
   block inside admin/distribution-dashboard.html.

   The dashboard is a single self-contained file that opens from disk with no
   server, so it cannot fetch anything itself — this script is what keeps its
   numbers honest instead of a frozen snapshot.

   Run: npm run status      (probe + rewrite)
        npm run dashboard   (probe + rewrite + open it)
   ========================================================================== */

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const ROOT = path.resolve(__dirname, '..');
const PAGE = path.join(ROOT, 'admin', 'distribution-dashboard.html');
const BASE = 'https://venkyi21.github.io/pulse-streak';
const REPO = 'venkyi21/pulse-streak';

const TARGETS = [
  { key: 'play', label: 'Instant play', sub: '/pulse-streak/play/', purpose: 'Playable game, no install', url: `${BASE}/play/` },
  { key: 'landing', label: 'Landing page', sub: '/pulse-streak/', purpose: 'Shareable front door', url: `${BASE}/` },
  { key: 'privacy', label: 'Privacy policy', sub: '/privacy-policy.html', purpose: 'Required by every store', url: `${BASE}/privacy-policy.html` },
  { key: 'manifest', label: 'PWA install', sub: 'manifest.webmanifest', purpose: 'Home-screen install, no store', url: `${BASE}/play/manifest.webmanifest` },
  { key: 'repo', label: 'Source & releases', sub: `github.com/${REPO}`, purpose: 'Signed APK / AAB downloads', url: `https://github.com/${REPO}` }
];

/** HEAD-ish probe: status code plus wall-clock latency. Follows one redirect. */
function probe(url, depth = 0) {
  return new Promise((resolve) => {
    const started = Date.now();
    const req = https.get(url, { headers: { 'User-Agent': 'pulse-streak-status' } }, (res) => {
      const ms = Date.now() - started;
      const loc = res.headers.location;
      res.resume();
      if (loc && res.statusCode >= 300 && res.statusCode < 400 && depth < 3) {
        return resolve(probe(new URL(loc, url).href, depth + 1));
      }
      resolve({ code: res.statusCode, ms });
    });
    req.on('error', (e) => resolve({ code: 0, ms: Date.now() - started, error: e.code }));
    req.setTimeout(12000, () => { req.destroy(); resolve({ code: 0, ms: 12000, error: 'TIMEOUT' }); });
  });
}

function json(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'pulse-streak-status' } }, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } });
    }).on('error', () => resolve(null));
  });
}

const fmtMs = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms} ms`);

(async () => {
  console.log('Probing endpoints...');
  const hosts = [];
  for (const t of TARGETS) {
    const r = await probe(t.url);
    const ok = r.code >= 200 && r.code < 400;
    hosts.push({
      label: t.label, sub: t.sub, purpose: t.purpose,
      state: ok ? 'live' : 'blocked',
      stateLabel: ok ? 'Live' : (r.error || 'Down'),
      code: r.code || (r.error || 'ERR'),
      latency: fmtMs(r.ms)
    });
    console.log(`  ${ok ? 'LIVE   ' : 'DOWN   '}${t.label.padEnd(20)} ${r.code || r.error}  ${fmtMs(r.ms)}`);
  }

  const runs = await json(`https://api.github.com/repos/${REPO}/actions/runs?per_page=8`);
  const rel = await json(`https://api.github.com/repos/${REPO}/releases/latest`);
  const ci = runs && runs.workflow_runs && runs.workflow_runs.find((r) => r.name === 'CI');
  const pipeOk = ci ? ci.conclusion === 'success' : false;

  hosts.push({
    label: 'Release pipeline',
    sub: ci ? `CI #${ci.run_number}` : 'CI',
    purpose: 'Tag → signed build',
    state: pipeOk ? 'live' : 'blocked',
    stateLabel: pipeOk ? 'Passing' : 'Failing',
    code: rel ? rel.tag_name : '—',
    latency: rel ? `${(rel.assets || []).length} assets` : '—'
  });
  console.log(`  ${pipeOk ? 'LIVE   ' : 'DOWN   '}${'Release pipeline'.padEnd(20)} ${rel ? rel.tag_name : '?'}`);

  const status = {
    checkedAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    liveCount: hosts.filter((h) => h.state === 'live').length,
    hostCount: hosts.length,
    version: rel ? rel.tag_name.replace(/^v/, '') : 'unknown',
    hosts
  };

  let page = fs.readFileSync(PAGE, 'utf8');
  const begin = '// ── STATUS:BEGIN ──';
  const end = '// ── STATUS:END ──';
  const i = page.indexOf(begin), j = page.indexOf(end);
  if (i < 0 || j < 0) {
    console.error(`\nCould not find the STATUS block in ${path.relative(ROOT, PAGE)} — not rewriting.`);
    process.exit(1);
  }
  const block = `${begin} rewritten by \`npm run status\`; do not hand-edit ──\n` +
    `  const STATUS = ${JSON.stringify(status)};\n  `;
  page = page.slice(0, i) + block + page.slice(j);
  fs.writeFileSync(PAGE, page);

  console.log(`\n${status.liveCount}/${status.hostCount} endpoints live · latest release ${status.version}`);
  console.log(`Written to ${path.relative(ROOT, PAGE)} (checked ${status.checkedAt})`);
})();
