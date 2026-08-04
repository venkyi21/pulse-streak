# admin/ — internal tooling

Operator-facing tools that are **not part of the shipped game and not published
anywhere**.

## What's here

| File | Purpose |
|---|---|
| `distribution-dashboard.html` | Live host status + free-platform tracker. Single self-contained file; open it from disk, no server needed |

## Refreshing it

```bash
npm run status       # probe every endpoint + CI/release, rewrite the dashboard
npm run dashboard    # probe, then open it in your browser
```

The dashboard is one standalone HTML file, so it can be copied anywhere, emailed,
or opened offline — but that also means **it cannot fetch anything itself**.
`npm run status` is what keeps its numbers real; without it the page shows
whatever was true the last time you ran it, and says so in the header.

Your per-channel tick-boxes are saved in the browser's local storage, so they
persist between openings but live on whichever machine you opened it from.

## How "admin only" actually works here

Be clear-eyed about this, because it is easy to get wrong:

- **This folder is never published.** GitHub Pages serves only `docs/`. Nothing
  in `admin/` is reachable at `venkyi21.github.io`, and a test
  (`tests/unit/release-metadata.test.js`) fails the build if anything from
  `admin/` ever appears under `docs/`.
- **There is no password, and there cannot be one.** A static HTML file has no
  server to check credentials against. Any password in client-side JavaScript is
  visible to anyone who opens the file in a text editor, so adding one would be
  security theatre rather than access control.
- **The repository is public**, so the *file* is readable by anyone who visits
  the repo on GitHub. It holds no secrets — public URLs, platform names, and
  progress ticks — so this is a privacy nicety, not a security boundary.

If you want the dashboard genuinely private, either:

1. add `admin/` to `.gitignore` so it exists only on your machine (you lose
   version history and off-machine backup), or
2. make the repository private — but that ends free unlimited GitHub Actions
   minutes, and every tagged release compiles an Android build.

**Never put anything actually sensitive in here** — no keystore, no passwords, no
tokens. Those belong in a password manager and in GitHub Actions secrets.
