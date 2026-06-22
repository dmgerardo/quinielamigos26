# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Vanilla JS + Firebase Realtime Database SPA for a World Cup 2026 prediction pool ("quiniela"). No framework, no bundler, no npm — the app is a static site served directly from the file system or any static host.

## Running locally

```bash
python -m http.server 8000
# open http://localhost:8000
```

Firebase App Check's debug token is auto-enabled on `localhost` / `127.0.0.1` (see `js/firebase-config.js`), so the app works locally against the real Firebase project.

## Regenerating the fixture calendar

The 104-match calendar in `js/tournament-data.js` is generated from the spreadsheet — do not edit it by hand:

```bash
pip install openpyxl
python _gen_fixtures.py
```

## Cache-busting hook (activate once per clone)

Any commit touching `.css` or `.js` must bump the `?v=N` query string in `index.html` so browsers invalidate their cache. This is handled automatically by a pre-commit hook — activate it once:

```bash
git config core.hooksPath .githooks
```

After activation, `git commit` runs `scripts/bump-version.py` automatically. Requires `python` in PATH.

## Architecture

### File load order (matters — no bundler)

`index.html` loads scripts in dependency order:
1. Firebase SDK (compat, from CDN)
2. `js/firebase-config.js` — initialises `firebase`, `db`, `auth`; exports `FIREBASE_CONFIGURED`
3. `js/tournament-data.js` — exports `DEFAULT_GROUPS`, `ROUNDS`, `WC_FIXTURES`, `buildInitialMatches()`, `allTeamNames()`
4. `js/scoring.js` — exports `POINTS_RESULT`, `POINTS_EXACT`, `CHAMPION_POINTS`, `scoreMatch()`, `computeUserScore()`, `getRealChampion()`
5. `js/app.js` — entire UI and Firebase interaction logic (~1 680 lines)

### Player identity

Users have no account system. Identity is a stable **`playerKey`** derived client-side: `slugify(name) + "_" + code.toLowerCase()`. The same name + code always produces the same key on any device, so a user can rejoin from a new device. Firebase anonymous UID is used only to:
- Store `tournaments/{code}/admin: uid` at creation time
- Satisfy Firebase auth rules (all writes require `auth != null`)

Admin detection: `state.data.adminPlayerKey === state.playerKey`.

### Real-time data flow

A single listener on `db.ref("tournaments/" + code)` drives the entire app. On each snapshot, all four views are marked dirty and one render is queued via `requestAnimationFrame` to coalesce rapid bursts. Only the currently visible view is rendered immediately; others render lazily when the user switches tabs.

### Firebase data layout

```
publicTournaments/{code}/   ← index for the join screen (name, adminName)
tournaments/{code}/
  name, admin (uid), adminPlayerKey, createdAt
  participants/{playerKey}/  { name, championPick, joinedAt, passwordHash? }
  matches/{matchId}/         { id, round, group, teamA, teamB, kickoff, kickoffMs,
                               venue, slotA, slotB, editable,
                               realA, realB, played }
  predictions/{matchId}/{playerKey}/ { a, b, at }
```

### Prediction / champion locking

- **Predictions lock** 15 minutes before `kickoffMs` on the client (`LOCK_BEFORE_MS`). The Firebase rule enforces `now < kickoffMs - 900000` server-side as well — cannot be bypassed.
- **Champion pick** is locked after `CHAMPION_DEADLINE` (June 21 2026 00:00 local). The Firebase rule makes it **permanently immutable** once set to a non-empty value (`data.val() === '' || data.val() === newData.val()`).
- **Password hash** is likewise immutable once stored in Firebase.

### Password security

Passwords are hashed as SHA-256(`password + "|" + playerKey`) using `crypto.subtle` and stored as a 64-char hex string. Salt is the playerKey itself, so the same password for different names/tournaments produces different hashes.

### XSS prevention

All Firebase-sourced strings inserted via `innerHTML` must go through the `esc()` helper defined at the top of `app.js`. Never concatenate raw Firebase data into HTML strings.

## Key constants to know

| Location | Constant | Default | Effect |
|---|---|---|---|
| `js/scoring.js` | `POINTS_RESULT` | 3 | Points for correct outcome |
| `js/scoring.js` | `POINTS_EXACT` | 1 | Bonus for exact score |
| `js/scoring.js` | `CHAMPION_POINTS` | 15 | Bonus for picking the champion |
| `js/app.js` | `LOCK_BEFORE_MS` | 15 min | How early predictions lock before kickoff |
| `js/app.js` | `CHAMPION_DEADLINE` | 2026-06-21 | Champion pick cutoff (local time) |

## Deployment

Upload the static files to any host (Firebase Hosting, Netlify, GitHub Pages). There is no build step. The Firebase project is `quinielamigos26`; credentials and App Check site key are in `js/firebase-config.js`.
