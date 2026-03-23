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

### Content
Pulls the most recently added game (latest `date` in `batches[]`, last entry in that batch's `list[]`):

| Field | Source |
|---|---|
| Background image | `cover` field → IGDB `t_cover_big_2x`, fallback to Steam `library_600x900.jpg` |
| Game name | `name` |
| Score badge | `score` (if present) |
| Genre tags | first 3 genres from `genre` string |
| Release date | `release_date` (if present) |
| Verified badge | `verified: true` (if present) |

### Layout
- Full-width section above all rows, below the site header
- Background: game cover image, scaled to fill, with a dark gradient overlay (bottom-heavy) for text legibility
- Height: ~320px desktop, ~200px mobile
- Text anchored to bottom-left (RTL: bottom-right) of the banner
- Subtle "FEATURED" or "أحدث إضافة" label above the game name

### Behaviour
- Computed once at `init()` time — no polling, no setInterval
- If no score → score badge hidden
- If no verified → verified badge hidden
- Mobile: same layout, reduced height, font sizes scale down

---

## 2. Library Stats Strip

### Purpose
Give the library a "living" feel with at-a-glance numbers that update automatically as new games are added.

### Stats (left to right, RTL: right to left)

| Stat | Label (Arabic) | Computation |
|---|---|---|
| Total games | إجمالي الألعاب | `allGames.filter(g => !g.isComingSoon).length` |
| Steam Deck Verified | محقق للـ Deck | `allGames.filter(g => g.verified).length` |
| Newest addition | آخر إضافة | name of most recently added game |
| Added this month | هذا الشهر | count of games with `date_added` in current month/year |

### Layout
- Slim dark bar (`background: var(--card-bg)` or slightly lighter)
- 4 stat cells in a horizontal strip, each showing a number + label
- Placed in the footer area, above the existing copyright/request button
- Responsive: wraps to 2×2 grid on mobile

### Behaviour
- Computed once at `init()` time from `allGames`
- "This month" uses current date at page load (no timezone complexity needed — just month/year match on `date_added`)

---

## Files to Change

| File | Change |
|---|---|
| `script.js` | Add `buildHeroBanner()` function; add `buildStatsStrip()` function; call both from `init()` |
| `style.css` | Add `.hero-banner`, `.hero-overlay`, `.hero-content`, `.stats-strip`, `.stat-cell` styles |
| `index.html` | Add `<div id="hero-banner">` above the grid; add `<div id="stats-strip">` in footer; bump `script.js?v` and `style.css?v` |

---

## Out of Scope
- No manual game selection for the hero — always newest
- No click-through / linking to external pages
- No animations beyond the existing CSS transitions already in the codebase
- No new data fields required in `games.js`
