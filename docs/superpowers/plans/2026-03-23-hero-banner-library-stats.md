# Hero Banner + Library Stats Strip Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a cinematic hero banner showing the newest game, and a footer stats strip showing 4 library counts.

**Architecture:** Pure DOM manipulation — two new JS functions (`buildHeroBanner`, `buildStatsStrip`) called from `init()` after `allGames` is populated. Styles added to `style.css`. No new data, no build tools, no external dependencies.

**Tech Stack:** Vanilla JS, CSS custom properties (already used in codebase), Arabic RTL layout (`direction: rtl` already set globally)

**Spec:** `docs/superpowers/specs/2026-03-23-hero-banner-library-stats-design.md`

---

## Chunk 1: CLAUDE.md housekeeping + HTML scaffolding

### Task 1: Fix CLAUDE.md schema and cache-busting rule

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Read CLAUDE.md to find the batches schema block and cache-busting rule**

Open `CLAUDE.md` and locate:
1. The `batches[]` schema block showing `games: [ ... ]`
2. The cache-busting rule in Critical Rules section

- [ ] **Step 2: Fix the batches schema key**

In the `batches[]` schema block, change:
```
games: [ ... ]
```
to:
```
list: [ ... ]
```

This matches the actual key used in `games.js` (confirmed: every batch uses `list`, not `games`).

- [ ] **Step 3: Add style.css to the cache-busting rule**

In Critical Rules → Rule 1, add a line:
```
Every edit to `style.css` MUST bump its `?v=N` in `index.html` (e.g. `v=5` → `v=6`).
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "Fix CLAUDE.md: batches use list key, add style.css cache-busting rule"
```

---

### Task 2: Add HTML placeholders to index.html

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Read index.html around the game grid and footer**

Locate line ~88 (`<div class="container" id="gameGrid">`) and line ~100 (`<footer>`).

- [ ] **Step 2: Insert hero banner div before the game grid**

Insert immediately before `<div class="container" id="gameGrid"></div>`:
```html
<!-- Hero Banner -->
<div id="hero-banner"></div>
```

- [ ] **Step 3: Insert stats strip div before the footer**

Insert immediately before `<footer>`:
```html
<!-- Library Stats -->
<div id="stats-strip"></div>
```

- [ ] **Step 4: Verify version params exist for both script.js and style.css**

Confirm `index.html` has lines like:
```html
<link rel="stylesheet" href="style.css?v=N">
<script src="script.js?v=N">
```
Note the current N values — you will bump them in later tasks.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "Add hero-banner and stats-strip placeholder divs to index.html"
```

---

## Chunk 2: CSS styles

### Task 3: Add hero banner styles to style.css

**Files:**
- Modify: `style.css`

- [ ] **Step 1: Read style.css to find a good insertion point**

Scroll to the end of the existing component styles (before media queries). Find the `.game-card` or `.container` section to understand the existing pattern.

- [ ] **Step 2: Add hero banner CSS**

Append the following before the first `@media` block in style.css:

```css
/* =========================================
   HERO BANNER
   ========================================= */
#hero-banner {
    position: relative;
    width: 100%;
    height: 320px;
    overflow: hidden;
    background-size: cover;
    background-position: center;
    background-color: var(--card-bg);
    margin-bottom: 32px;
}

.hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%);
}

.hero-content {
    position: absolute;
    bottom: 24px;
    right: 24px;
    max-width: 600px;
}

.hero-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 8px;
    opacity: 0.85;
}

.hero-title {
    font-size: 28px;
    font-weight: 800;
    color: #fff;
    margin: 0 0 10px 0;
    line-height: 1.2;
}

.hero-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.hero-score {
    background: var(--gold);
    color: #000;
    font-weight: 800;
    font-size: 13px;
    padding: 3px 10px;
    border-radius: 20px;
}

.hero-verified {
    width: 20px;
    height: 20px;
}

.hero-genre-tag {
    background: rgba(255,255,255,0.15);
    color: #fff;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 12px;
}

.hero-date {
    color: rgba(255,255,255,0.7);
    font-size: 12px;
}
```

- [ ] **Step 3: Add stats strip CSS**

Append after the hero CSS:

```css
/* =========================================
   LIBRARY STATS STRIP
   ========================================= */
#stats-strip {
    background: var(--card-bg);
    border-top: 1px solid rgba(255,255,255,0.07);
    padding: 20px 24px;
    display: flex;
    justify-content: center;
    gap: 0;
    direction: rtl;
}

.stat-cell {
    flex: 1;
    text-align: center;
    padding: 8px 16px;
    border-left: 1px solid rgba(255,255,255,0.07);
}

.stat-cell:last-child {
    border-left: none;
}

.stat-number {
    font-size: 28px;
    font-weight: 800;
    color: var(--gold);
    display: block;
    line-height: 1;
    margin-bottom: 6px;
}

.stat-label {
    font-size: 11px;
    color: rgba(255,255,255,0.5);
    display: block;
}
```

- [ ] **Step 4: Add mobile responsive rules**

Inside the existing `@media (max-width: 600px)` block, add:

```css
#hero-banner {
    height: 200px;
    margin-bottom: 20px;
}

.hero-title {
    font-size: 18px;
}

.hero-content {
    bottom: 16px;
    right: 16px;
}

#stats-strip {
    flex-wrap: wrap;
    padding: 12px;
}

.stat-cell {
    width: 50%;
    flex: none;
    border-left: none;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    padding: 12px 8px;
}
```

- [ ] **Step 5: Bump style.css version in index.html**

In `index.html`, find `style.css?v=N` and increment N by 1.

- [ ] **Step 6: Commit**

```bash
git add style.css index.html
git commit -m "Add hero banner and stats strip CSS styles"
```

---

## Chunk 3: JavaScript — buildHeroBanner()

### Task 4: Implement buildHeroBanner() in script.js

**Files:**
- Modify: `script.js`

- [ ] **Step 1: Read script.js init() function (lines 67–87)**

Understand where `allGames` is populated and confirm `batches` global is accessible. The function ends at line 87 with `resetAndRender()`.

- [ ] **Step 2: Add buildHeroBanner() function**

Add the following function after the `init()` function (after line 87), before the `/* 2. FILTERS & SORTING */` comment:

```js
/* =========================================
   HERO BANNER
   ========================================= */
function buildHeroBanner() {
    const el = document.getElementById('hero-banner');
    if (!el || !batches || !batches.length) return;

    const batch = batches[0];
    const game = batch.list[batch.list.length - 1];
    if (!game) return;

    // Determine image URL
    const igdbUrl = game.cover
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${game.cover}.jpg`
        : null;
    const steamUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.id}/library_600x900.jpg`;
    const primaryUrl = igdbUrl || steamUrl;

    el.style.backgroundImage = `url('${primaryUrl}')`;

    // Fallback: if primaryUrl fails, swap to steamUrl
    if (igdbUrl) {
        const probe = new Image();
        probe.onerror = () => { el.style.backgroundImage = `url('${steamUrl}')`; };
        probe.src = igdbUrl;
    }

    // Build optional meta items
    const genres = game.genre
        ? game.genre.split(', ').slice(0, 3).map(g => `<span class="hero-genre-tag">${g}</span>`).join('')
        : '';
    const score = game.score ? `<span class="hero-score">${game.score}</span>` : '';
    const verified = game.verified
        ? `<img src="assets/badge_verified.png" class="hero-verified" alt="Verified">`
        : '';
    const date = game.release_date ? `<span class="hero-date">${game.release_date}</span>` : '';

    el.innerHTML = `
        <div class="hero-overlay"></div>
        <div class="hero-content">
            <div class="hero-label">أحدث إضافة</div>
            <div class="hero-title">${game.name}</div>
            <div class="hero-meta">
                ${score}${verified}${genres}${date}
            </div>
        </div>
    `;
}
```

- [ ] **Step 3: Call buildHeroBanner() from init()**

In `init()`, add the call **after** `allGames = [...comingSoonWithFlag, ...games];` and **before** `populateGenreFilter()`:

```js
allGames = [...comingSoonWithFlag, ...games];
buildHeroBanner();   // ← add this line
populateGenreFilter();
```

- [ ] **Step 4: Verify no console errors**

Open `index.html` in a browser (or use the local server). Open DevTools → Console. Confirm:
- No errors on load
- Hero banner div has a background image set
- Game name, score, and genre tags render in the bottom-right of the banner

- [ ] **Step 5: Bump script.js version in index.html**

In `index.html`, find `script.js?v=N` and increment N by 1.

- [ ] **Step 6: Commit**

```bash
git add script.js index.html
git commit -m "Add buildHeroBanner() — shows newest game with cinematic background"
```

---

## Chunk 4: JavaScript — buildStatsStrip()

### Task 5: Implement buildStatsStrip() in script.js

**Files:**
- Modify: `script.js`

- [ ] **Step 1: Add buildStatsStrip() function**

Add immediately after `buildHeroBanner()`:

```js
/* =========================================
   LIBRARY STATS STRIP
   ========================================= */
function buildStatsStrip() {
    const el = document.getElementById('stats-strip');
    if (!el || !allGames.length) return;

    const thisMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-03"

    const totalGames = allGames.filter(g => !g.isComingSoon).length;
    const verifiedCount = allGames.filter(g => g.verified && !g.isComingSoon).length;
    const newestGameName = batches[0].list[batches[0].list.length - 1].name; // string, not a count
    const addedThisMonth = allGames.filter(g =>
        g.date_added && g.date_added.slice(0, 7) === thisMonth
    ).length;

    // `value` can be a number or a string (stat #3 shows a game name)
    const stats = [
        { value: totalGames, label: 'إجمالي الألعاب' },
        { value: verifiedCount, label: 'محقق للـ Deck' },
        { value: newestGameName, label: 'آخر إضافة' },
        { value: addedThisMonth, label: 'هذا الشهر' },
    ];

    el.innerHTML = stats.map(s => `
        <div class="stat-cell">
            <span class="stat-number">${s.value}</span>
            <span class="stat-label">${s.label}</span>
        </div>
    `).join('');
}
```

- [ ] **Step 2: Call buildStatsStrip() from init()**

In `init()`, add the call **after** `buildHeroBanner()`:

```js
allGames = [...comingSoonWithFlag, ...games];
buildHeroBanner();
buildStatsStrip();   // ← add this line
populateGenreFilter();
```

- [ ] **Step 3: Verify stats strip renders correctly**

Open in browser. Scroll to the footer. Confirm:
- 4 stat cells visible above the footer copyright line
- Numbers are correct (spot-check total against a manual count)
- "آخر إضافة" shows a game name (not a number)
- Layout is RTL (rightmost cell is first in reading order)
- On mobile (resize browser to < 600px): cells wrap to 2×2 grid

- [ ] **Step 4: Bump script.js version in index.html**

In `index.html`, find `script.js?v=N` and increment N by 1.

- [ ] **Step 5: Commit and push**

```bash
git add script.js index.html
git commit -m "Add buildStatsStrip() — 4-cell footer showing library stats"
git fetch origin main && git rebase origin/main && git push origin claude/zen-sutherland:main
```

---

## Final Checklist

- [ ] Hero banner shows newest game with background image, name, score, genres, verified badge (conditional)
- [ ] Hero banner falls back to Steam CDN if IGDB image fails
- [ ] Stats strip shows 4 cells: total games, verified count, newest game name, added this month
- [ ] Both work on mobile (hero collapses to 200px, stats wrap to 2×2)
- [ ] No console errors
- [ ] `style.css?v`, `script.js?v` both bumped in `index.html`
- [ ] CLAUDE.md updated: `list` key, `style.css` cache-busting rule
- [ ] All changes pushed to `main`
