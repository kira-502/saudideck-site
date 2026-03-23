# Recently Added Row + Richer Card Hover + Mobile Swipe Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "آخر الإضافات" carousel row for games added in the last 30 days, polish the card hover animation with staggered reveals and smoother easing, and add CSS scroll snap for native-feeling mobile swipes.

**Architecture:** Three additive changes across two files. The recently added row reuses the existing `buildRowHTML()` carousel factory with a filtered + sorted slice of `allGames`. The hover and swipe improvements are pure CSS targeting existing selectors — no HTML changes needed.

**Tech Stack:** Vanilla JS, CSS, no build tools. Static site — edits to `script.js` require `?v=N+1` in `index.html`; edits to `style.css` require `?v=N+1` in `index.html`.

**Spec:** `docs/superpowers/specs/2026-03-23-recently-added-hover-swipe-design.md`

---

## Chunk 1: Recently Added Row

### Task 1: Insert Recently Added Row into renderGrid()

**Files:**
- Modify: `script.js` (renderGrid function, ~lines 298–313)
- Modify: `index.html` (script.js version bump)

**Context for implementer:**

`renderGrid()` builds the page by concatenating HTML strings into `html`, then sets `grid.innerHTML = html`. The structure is:

```
Coming Soon row
2026 row
FIXED_GENRES rows  ← insert after this block
Randomized genre rows  ← insert before this block
```

The fixed genres block ends at line ~302:
```js
FIXED_GENRES.forEach(gKey => {
    const matches = visibleGames.filter(g => !g.isComingSoon && g.genre && g.genre.includes(gKey));
    if (matches.length > 0) html += buildRowHTML(gKey.toUpperCase(), matches, gKey);
});
```

The randomized genres block starts immediately after at line ~305:
```js
if (_shuffledGenres.length === 0) {
```

`buildRowHTML(title, games, idPrefix, isSpecial)` signature — first 3 args required, 4th defaults to `false`.

`allGames` is the global array. Games from `batches[]` have `date_added: "YYYY-MM-DD"` (ISO date string). Games from `baseLibrary` have no `date_added`. `isComingSoon` flag is set on upcoming games.

- [ ] **Step 1: Read script.js lines 295–315** to confirm exact insertion point

- [ ] **Step 2: Insert Recently Added row between fixed genres and randomized genres**

Insert this block immediately after the `FIXED_GENRES.forEach` block and immediately before the `if (_shuffledGenres.length === 0)` line:

```js
        // Recently Added (last 30 days)
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const recentGames = allGames
            .filter(g => !g.isComingSoon && g.date_added && new Date(g.date_added) >= cutoff)
            .sort((a, b) => new Date(b.date_added) - new Date(a.date_added));
        if (recentGames.length > 0) html += buildRowHTML('آخر الإضافات', recentGames, 'recently-added');
```

- [ ] **Step 3: Read index.html** to find the current `script.js?v=N` value

- [ ] **Step 4: Bump script.js version in index.html**

Change `script.js?v=21` → `script.js?v=22`

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/mdoss/saudideck-site/.claude/worktrees/zen-sutherland" && git add script.js index.html && git commit -m "Add Recently Added carousel row — last 30 days, newest first"
```

---

## Chunk 2: CSS — Card Hover Animation + Mobile Swipe

### Task 2: Polish card hover animation and add scroll snap

**Files:**
- Modify: `style.css` (game-info, game-title, game-meta, game-genre, row-carousel, game-card selectors)
- Modify: `index.html` (style.css version bump)

**Context for implementer:**

Current relevant CSS (read to confirm before editing):

```css
/* Line ~137 */
.game-info { ... transition: transform 0.28s ease; }

/* Line ~139 */
.game-title { font-size: 0.95rem; ... }

/* Line ~140 */
.game-meta, .game-genre { display: none; ... }

/* Line ~141 */
.game-card:hover .game-meta, .game-card:hover .game-genre { display: block; }

/* Line ~84 */
.row-carousel { display: flex; gap: 20px; overflow-x: auto; scroll-behavior: smooth; ... }

/* Line ~93 */
.game-card { ... }
```

**Three CSS changes to make:**

**Change A — Smoother easing + backdrop blur on `.game-info`:**

Find:
```css
.game-info { position: absolute; bottom: 0; left: 0; width: 100%; padding: 35px 10px 12px; background: linear-gradient(0deg, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.88) 60%, rgba(0,0,0,0) 100%); z-index: 1; transform: translateY(100%); transition: transform 0.28s ease; }
```

Replace `transition: transform 0.28s ease;` with `transition: transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94);` and append `backdrop-filter: blur(2px);` to the rule.

**Change B — Staggered fade-in for title/genre/meta:**

The `.game-title`, `.game-meta`, and `.game-genre` elements are inside `.game-info` which slides up. Add opacity transitions with staggered delays so they cascade in:

After the `.game-card:hover .game-meta, .game-card:hover .game-genre { display: block; }` line, append:

```css
.game-title { opacity: 0; transition: opacity 0.25s ease 0ms; }
.game-genre { opacity: 0; transition: opacity 0.25s ease 80ms; }
.game-meta  { opacity: 0; transition: opacity 0.25s ease 140ms; }
.game-card:hover .game-title,
.game-card:hover .game-genre,
.game-card:hover .game-meta  { opacity: 1; }
```

> Note: `.game-title` already has other CSS properties defined above. These new rules add `opacity` and `transition` via cascade — they do not replace the existing font/layout rules. Since both rules target `.game-title`, the later rule's `opacity` and `transition` properties will apply (CSS cascade by source order). This is intentional.

**Change C — Scroll snap on carousels:**

Find the `.row-carousel` rule (line ~84) and add two properties:
```css
scroll-snap-type: x mandatory;
-webkit-overflow-scrolling: touch;
```

Find the `.game-card` rule (line ~93) and add:
```css
scroll-snap-align: start;
```

- [ ] **Step 1: Read style.css lines 84–145** to see exact current values

- [ ] **Step 2: Apply Change A** — update `.game-info` transition easing and add `backdrop-filter`

- [ ] **Step 3: Apply Change B** — add staggered opacity transitions after the existing hover display rules

- [ ] **Step 4: Apply Change C** — add scroll-snap to `.row-carousel` and `scroll-snap-align` to `.game-card`

- [ ] **Step 5: Read index.html** to confirm current `style.css?v=N`

- [ ] **Step 6: Bump style.css version in index.html**

Change `style.css?v=6` → `style.css?v=7`

- [ ] **Step 7: Commit and push to main**

```bash
cd "C:/Users/mdoss/saudideck-site/.claude/worktrees/zen-sutherland" && git add style.css index.html && git commit -m "Polish card hover animation; add CSS scroll snap for mobile swipe"
```

```bash
cd "C:/Users/mdoss/saudideck-site/.claude/worktrees/zen-sutherland" && git fetch origin main && git rebase origin/main && git push origin claude/zen-sutherland:main
```
