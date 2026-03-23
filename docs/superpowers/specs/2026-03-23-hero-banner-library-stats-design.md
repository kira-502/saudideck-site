# Design: Hero Banner + Library Stats Strip

**Date:** 2026-03-23
**Status:** Approved
**Project:** SaudiDeck (saudideck.games)

---

## Overview

Two complementary visual additions to the SaudiDeck site:
1. **Hero Banner** — a cinematic spotlight at the top of the page, always showing the most recently added game
2. **Library Stats Strip** — a slim footer bar summarising key library numbers

Both are purely display-only, computed at runtime from existing `games.js` data. No new data fields or external API calls required.

---

## 1. Hero Banner

### Purpose
Give the page a strong visual entry point that always reflects what's new. No manual curation — it auto-updates whenever a new batch is added.

### Selecting the Featured Game
`batches[]` in `games.js` is ordered newest-first. Each batch uses the key `list` (not `games` — CLAUDE.md's schema block is outdated and must be corrected as part of this implementation). `batches` is a globally scoped variable declared in `games.js` and directly accessible throughout `script.js`.

The featured game is always the **last item in the most recent batch** (last-added within that batch):

```js
const batch = batches[0];
const game = batch.list[batch.list.length - 1];
```

### Content

| Field | Source |
|---|---|
| Background image | If `game.cover` → IGDB URL (see below); otherwise → Steam `library_600x900.jpg` |
| Game name | `game.name` |
| Score badge | `game.score` (hidden if absent) |
| Genre tags | First 3 from `game.genre.split(', ')` |
| Release date | `game.release_date` (hidden if absent) |
| Verified badge | `game.verified === true` (hidden if absent) |

**Image URLs:**
- IGDB: `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${game.cover}.jpg`
- Steam: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.id}/library_600x900.jpg`

**Image fallback:** Set `background-image` to the primary URL. Add an `onerror` inline handler on a hidden `<img>` probe — if the IGDB URL fails, swap the div's `background-image` to the Steam URL via JS. This mirrors the existing `onerror` pattern already used in `createGameCard()`.

### DOM Placement
Insert `<div id="hero-banner"></div>` **immediately before** `<div class="container" id="gameGrid"></div>` (line 89 of current `index.html`), after the filter bar and before the game grid.

### Layout
- Full-width section, no horizontal margin
- Background: CSS `background-image` on the hero div with `background-size: cover; background-position: center` (not an `<img>` tag)
- Dark gradient overlay: child `<div class="hero-overlay">` with `background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)`
- Height: `320px` desktop, `200px` mobile
- Text content in `<div class="hero-content">`: `position: absolute; bottom: 24px; right: 24px` — RTL-native, do **not** use `left`
- Small label `أحدث إضافة` above the game name in muted gold

### Behaviour
- Computed once inside `init()` — no polling, no `setInterval`
- All optional fields (score, verified, release date) conditionally rendered — no empty placeholders

---

## 2. Library Stats Strip

### Purpose
Give the library a "living" feel with at-a-glance numbers that update automatically as new games are added.

### DOM Placement
Insert `<div id="stats-strip"></div>` **immediately before** `<footer>` (line 101 of current `index.html`), after the `<div class="geometric-divider">` and before the footer copyright text.

### Call Order
`buildStatsStrip()` must be called **after** `allGames` is fully populated in `init()` — after both `batches` and `comingSoonGames` have been processed and graduation logic has run.

### Stats

| # | Stat | Arabic Label | Computation |
|---|---|---|---|
| 1 | Total games | إجمالي الألعاب | `allGames.filter(g => !g.isComingSoon).length` — includes auto-graduated coming-soon games (intentional) |
| 2 | Steam Deck Verified | محقق للـ Deck | `allGames.filter(g => g.verified && !g.isComingSoon).length` |
| 3 | Newest addition | آخر إضافة | `batches[0].list[batches[0].list.length - 1].name` (reads from `batches` global directly) |
| 4 | Added this month | هذا الشهر | `allGames.filter(g => g.date_added && g.date_added.slice(0, 7) === new Date().toISOString().slice(0, 7)).length` |

**Notes on stat #4:**
- Guard `g.date_added &&` is required — `baseLibrary` games have no `date_added` field, and graduated coming-soon games also lack it (they come from `comingSoonGames[]` which uses `release_info`). The guard handles both cases — they are simply excluded from the count.
- Uses UTC month (`toISOString().slice(0, 7)`) — this is a display stat, not a timer, so UTC is acceptable. It does not need to follow the NY timezone convention used for countdown timers.

### Layout
- Slim dark bar (`background: var(--card-bg)`)
- 4 stat cells in a horizontal RTL strip, each: bold large number on top, small Arabic label below
- Responsive: `flex-wrap: wrap`, each cell `width: 50%` on mobile (2×2 grid)

---

## Files to Change

| File | Change |
|---|---|
| `script.js` | Add `buildHeroBanner()` and `buildStatsStrip()` functions; call both from `init()` after `allGames` is populated; bump `?v=N→N+1` in `index.html` |
| `style.css` | Add `.hero-banner`, `.hero-overlay`, `.hero-content`, `.stats-strip`, `.stat-cell` styles; bump `?v=N→N+1` in `index.html` |
| `index.html` | Insert hero div before `#gameGrid`; insert stats div before `<footer>`; bump both `script.js?v` and `style.css?v` — **both must be bumped** (CLAUDE.md only calls out `games.js` and `script.js` but `style.css` has a versioned query param and must also be bumped when edited) |
| `CLAUDE.md` | Fix `batches[]` schema: change `games: [ ... ]` → `list: [ ... ]`; add `style.css?v` to the cache-busting rule |

---

## Out of Scope
- No manual game selection for the hero — always newest
- No click-through / linking to external pages
- No animations beyond existing CSS transitions already in the codebase
- No new data fields required in `games.js`
