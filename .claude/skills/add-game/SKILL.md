---
name: add-game
description: Add one or more games to SaudiDeck — single search per game, auto-placement, batch support
---

# Add Game to SaudiDeck

Supports adding one or multiple games in a single pass.

## Step 1 — Single search per game

For each game, run ONE web search combining all needed info:

```
"[Game Name]" Steam App ID Metacritic score Steam Deck Verified
```

Extract from results:
- **Steam App ID** — the number from `store.steampowered.com/app/APPID/`
- **Metacritic score** — critic score (NOT user score). Omit `score` field if not found.
- **Deck Verified** — set `verified: true` only if explicitly "Verified" (not just "Playable")
- **Genre** — use the primary genres (Action, RPG, Horror, etc.), comma-separated, max 5
- **Release year** — as a number

## Step 2 — Determine game type and build object

**Released game** → add to `batches[0].list` (the newest batch) in `games.js`:
```js
{ name: "Title", id: "APPID", genre: "Action, RPG", year: 2024, score: 85, verified: true }
```
- `score` and `verified` are optional — omit if unknown/not applicable
- ID is a string (quoted)

**2026 game** (released in 2026, already out) → same as above but add `release_date` and `cover`:
```js
{ name: "Title", id: "APPID", genre: "RPG", year: 2026, score: 86, release_date: "DD/MM/YYYY", cover: "IGDB_ID" }
```

**Coming soon game** → add to `comingSoonGames[]`:
```js
{ name: "Title", id: "APPID", genre: "Action", year: "2026", release_info: "DD/MM/YYYY", release_type: "date", cover: "IGDB_ID" }
```
- Use `"TBA"` for `release_info` if no date is known

## Step 3 — IGDB cover (2026 and coming soon ONLY)

Skip this for regular released games — they use Steam CDN images automatically.

Search: `[Game Name] site:backloggd.com`
- Find the cover image URL: `https://images.igdb.com/igdb/image/upload/t_cover_big/COVERID.jpg`
- Use only the `COVERID` part (e.g. `co7dod`) as the `cover` field
- Cover IDs start with `co` followed by alphanumeric characters

## Step 4 — Edit files

1. Read `games.js` — find the insertion point (newest batch or comingSoonGames)
2. Insert the game object(s) alphabetically within the batch
3. Read `index.html` — find `games.js?v=N` and bump to `v=N+1`
4. Commit and push:
```bash
git add games.js index.html && git commit -m "Add [GAME] to library" && git fetch origin main && git rebase origin/main && git push origin claude/zen-sutherland:main
```

## Batch mode

When adding multiple games, do Steps 1-2 in parallel (multiple web searches at once), then apply all edits to `games.js` in a single pass with one version bump and one commit.

## Field reference

| Field | Released | 2026 | Coming Soon |
|---|---|---|---|
| `name` | Required | Required | Required |
| `id` | Required (string) | Required (string) | Required (string) |
| `genre` | Required | Required | Required |
| `year` | Required (number) | Required (number) | Required (string) |
| `score` | If known | If known | If known |
| `verified` | If Verified | If Verified | If Verified |
| `release_date` | — | Required DD/MM/YYYY | — |
| `cover` | — | Required | Required |
| `release_info` | — | — | Required |
| `release_type` | — | — | Always `"date"` |
