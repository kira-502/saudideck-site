---
name: add-game
description: Add a new game to SaudiDeck — guides through Steam ID lookup, IGDB cover fetch, correct placement in games.js, and version bump
---

# Add Game to SaudiDeck

Use this skill when the user asks to add a game to the SaudiDeck gaming library website.

## Step 1 — Determine game type

Ask (or infer from context) which case applies:

- **Released game** → goes into `batches[]` in `games.js`
- **Coming soon game** (not yet released, or releasing later in 2026+) → goes into `comingSoonGames[]` in `games.js`
- **2026 game** (releasing in 2026, already known) → goes into `batches[]` but requires `release_date` and `cover` fields

If unclear, ask the user before proceeding.

---

## Step 2 — Find the Steam App ID

- Look up the game on the Steam store: `https://store.steampowered.com/search/`
- The App ID is the number in the URL: `store.steampowered.com/app/APPID/Game_Name/`
- Verify the ID is correct by checking the header image loads:
  `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/APPID/header.jpg`
- If the image loads (HTTP 200), the App ID is valid.

---

## Step 3 — Gather game metadata

Collect the following fields:

| Field | Notes |
|---|---|
| `name` | Full game title as it appears on Steam |
| `id` | Steam App ID (number, no quotes) |
| `genre` | Short genre label, e.g. `"Action"`, `"RPG"`, `"Strategy"` |
| `year` | Release year as a number, e.g. `2024` |
| `score` | Metacritic or review score if known; omit field if unknown |
| `verified` | Set to `true` if Steam Deck Verified; omit otherwise |
| `release_date` | **2026 games only** — format `DD/MM/YYYY` |
| `cover` | **2026 and coming soon games only** — IGDB image ID (see Step 4) |
| `release_info` | **Coming soon only** — format `DD/MM/YYYY` or `"TBA"` |
| `release_type` | **Coming soon only** — always `"date"` |

---

## Step 4 — Find the IGDB Cover ID (2026 and coming soon games only)

Regular released games (non-2026) do NOT need a cover — skip this step for those.

1. Go to `https://www.backloggd.com/games/GAME-SLUG/` (search for the game on backloggd.com)
2. Inspect the cover image on the page
3. Find the image URL in the format:
   `https://images.igdb.com/igdb/image/upload/t_cover_big/COVERID.jpg`
4. Copy only the `COVERID` portion (e.g. `co7dod`)
5. This becomes the `cover` field value

---

## Step 5 — Edit `games.js`

Open `/games.js` (at the repo root).

### Case A — Regular released game (non-2026)

Find the appropriate `batches[]` entry by year/genre or add to an existing batch. Add the game object:

```js
{ name: "Game Title", id: 123456, genre: "Action", year: 2024, score: 85, verified: true }
```

- `score` and `verified` are optional — omit if not applicable.
- Do NOT add `cover` or `release_date` for regular released games.

### Case B — 2026 game

Find or create the 2026 batch in `batches[]`. Add the game object:

```js
{ name: "Game Title", id: 123456, genre: "RPG", year: 2026, release_date: "15/03/2026", cover: "co7dod" }
```

- `release_date` must be in `DD/MM/YYYY` format.
- `cover` is required (IGDB image ID from Step 4).
- The 2026 row is sorted by `release_date` descending automatically — no manual ordering needed.

### Case C — Coming soon game

Find the `comingSoonGames[]` array. Add the game object:

```js
{ name: "Game Title", id: 123456, genre: "Strategy", year: 2026, release_info: "TBA", release_type: "date", cover: "co7dod" }
```

- `release_info` is `DD/MM/YYYY` if a specific date is known, or `"TBA"` if not.
- `release_type` is always `"date"`.
- `cover` is required (IGDB image ID from Step 4).
- Coming soon games are sorted by nearest release date automatically — no manual ordering needed.

---

## Step 6 — Bump the version in `index.html`

After saving `games.js`, open `index.html` and find the script tag that loads `games.js`:

```html
<script src="games.js?v=N"></script>
```

Increment `N` by 1 (e.g. `?v=12` → `?v=13`).

This busts the browser cache so visitors see the updated game list.

---

## Step 7 — Verify

- Confirm the game object is correctly placed (right array, right batch).
- Confirm all required fields are present for the game type.
- Confirm `index.html` version is bumped.
- Confirm no trailing commas or syntax errors were introduced in `games.js`.

---

## Quick reference — field requirements by game type

| Field | Regular | 2026 | Coming Soon |
|---|---|---|---|
| `name` | Required | Required | Required |
| `id` | Required | Required | Required |
| `genre` | Required | Required | Required |
| `year` | Required | Required | Required |
| `score` | Optional | Optional | Optional |
| `verified` | Optional | Optional | Optional |
| `release_date` | No | Required (DD/MM/YYYY) | No |
| `cover` | No | Required | Required |
| `release_info` | No | No | Required (DD/MM/YYYY or "TBA") |
| `release_type` | No | No | Required ("date") |
