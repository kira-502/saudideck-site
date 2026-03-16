# SaudiDeck Site — CLAUDE.md

## Project Overview

Arabic RTL dark-themed gaming library website. Static site — no build tools, no framework, no bundler.

**Working directory:** `C:/Users/mdoss/saudideck-site/.claude/worktrees/zen-sutherland/`

Always work in the worktree, not the root project folder.

---

## File Structure

| File | Purpose |
|------|---------|
| `index.html` | Entry point; references `games.js?v=N` and `script.js?v=N` with cache-busting params |
| `games.js` | All game data: `batches[]`, `comingSoonGames[]`, `baseLibrary[]` |
| `script.js` | Rendering logic: `renderGrid`, `buildRowHTML`, `buildSpotlightHTML`, countdown timers, graduation logic |
| `style.css` | All styles |
| `guide-pc.html` | Standalone PC guide page |
| `guide-deck.html` | Standalone Steam Deck guide page |

---

## Critical Rules

### 1. Cache Busting — Never Skip This
Every edit to `games.js` MUST bump its `?v=N` in `index.html` (e.g. `v=58` → `v=59`).
Every edit to `script.js` MUST bump its `?v=N` in `index.html` the same way.
If you forget, users will see stale cached versions.

### 2. Git Workflow — Commit Directly to Main
No PRs, no feature branches. Push directly to `main`:
```
git fetch origin main && git rebase origin/main && git push origin claude/zen-sutherland:main
```

### 3. RTL Layout
This is an Arabic RTL site. In RTL flex rows, the **first DOM element is the rightmost visually**. "First" and "last" are reversed compared to LTR. Keep this in mind when ordering elements or reasoning about layout direction.

### 4. Always Read Before Editing
Always use the Read tool on a file before editing it. Editing without reading first causes "file not read" errors.

---

## Image Sources

**Regular library games** (portrait cards, 180×260px):
- Primary: Steam CDN `library_600x900.jpg`
- Fallback: `header.jpg`

**2026 row and Coming Soon games** (wide/cover cards):
- IGDB: `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/{cover}.jpg`
- Find cover IDs on **backloggd.com**

---

## games.js Data Structures

### `batches[]` — Released games
```js
{
  date: "DD/MM/YYYY",   // batch release date; games inherit date_added
  games: [ ... ]
}
```

### `comingSoonGames[]` — Upcoming games
```js
{
  title: "...",
  cover: "igdb_cover_id",       // IGDB cover ID
  release_info: "DD/MM/YYYY",   // or "TBA"
  release_type: "date",
  verified: true,               // optional: Steam Deck Verified
  score: 90                     // optional: Metacritic/OpenCritic score
}
```

### `baseLibrary[]` — Older games without batch dates
Standard game objects with no `date_added`.

---

## Date & Time Rules

- All release dates use `DD/MM/YYYY` format.
- Countdown timers and graduation logic use **midnight New York time** (auto EST/EDT).

---

## Row Sort Orders

- **2026 row**: sorted by `release_date` descending — newest release first.
- **Coming Soon row**: sorted by nearest `release_info` date first, TBA entries last.

---

## Optional Game Fields

- `verified: true` — add for Steam Deck Verified games.
- `score: N` — add Metacritic or OpenCritic score when known.
