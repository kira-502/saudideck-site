# Design: Recently Added Row + Richer Card Hover + Mobile Swipe

**Date:** 2026-03-23
**Status:** Approved

---

## Overview

Three independent UI enhancements to SaudiDeck:

1. **Recently Added Row** — a new carousel row showing games added in the last 30 days
2. **Richer Card Hover** — smoother, staggered animation on the existing card info overlay
3. **Mobile Swipe** — CSS scroll snap on carousels for native-feeling touch swipes

All changes are additive. No existing functionality is removed or restructured.

---

## 1. Recently Added Row

### Position
After the 6 FIXED_GENRES rows, before the randomized genre rows. Inserted in `renderGrid()`.

### Label
`آخر الإضافات` (Arabic: "Latest Additions")

### Filter Logic
```js
const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
const recentGames = allGames.filter(g =>
    !g.isComingSoon && g.date_added && new Date(g.date_added) >= cutoff
);
```

- `isComingSoon` guard excludes upcoming games
- `date_added` guard excludes `baseLibrary` games (they have no batch date)
- 30-day window is computed at runtime from `Date.now()`

### Sort Order
Sort `recentGames` by `date_added` descending (newest first) before passing to `buildRowHTML()`.

### Rendering
Call `buildRowHTML('آخر الإضافات', recentGames)` — reuses the existing carousel factory with no new markup or components. Row is only rendered if `recentGames.length > 0`.

### Cache Busting
Requires `script.js?v=N+1` bump in `index.html`.

---

## 2. Richer Card Hover (Animation Only)

### Goal
Make the existing info overlay reveal feel polished and physical — no new data displayed, no layout changes.

### Changes (CSS only)

**Staggered reveal via `transition-delay`:**
- `.info-title` (game name): delay 0ms
- `.info-genres` (genre tags): delay 80ms
- `.info-year` (year): delay 140ms

Elements already exist in the card HTML from `createGameCard()`. Only their transition timing changes.

**Smoother easing:**
Replace `ease` with `cubic-bezier(0.25, 0.46, 0.45, 0.94)` on the `.card-info` overlay slide-up transition. This easing decelerates naturally (fast start, gentle settle).

**Overlay backdrop blur:**
Add `backdrop-filter: blur(2px)` to `.card-info`. Softens the image behind the overlay text, improving readability without increasing darkness.

### No Changes
- No HTML changes to `createGameCard()`
- No new CSS classes
- No changes to badge or score display

### Cache Busting
Requires `style.css?v=N+1` bump in `index.html`.

---

## 3. Mobile Swipe (CSS Scroll Snap)

### Goal
Carousel rows feel native on touch — flick settles cleanly on a card boundary.

### Changes (CSS only)

```css
.row-carousel {
    scroll-snap-type: x mandatory;
}

.game-card {
    scroll-snap-align: start;
}
```

`-webkit-overflow-scrolling: touch` is already present on `.row-carousel` — keep it.

### Behavior
- **Mobile:** each swipe snaps to the nearest card's leading edge
- **Desktop:** no visible difference — free scroll continues to work normally
- **No JS added**

### Cache Busting
Requires `style.css?v=N+1` bump in `index.html` (combined with hover animation changes — one bump covers both CSS changes).

---

## Implementation Notes

### File changes summary

| File | Changes |
|------|---------|
| `script.js` | Add `recentGames` filter + sort + `buildRowHTML()` call in `renderGrid()` |
| `style.css` | Add transition-delay to card info children; update easing; add backdrop-filter; add scroll-snap rules |
| `index.html` | Bump `script.js?v=N` and `style.css?v=N` |

### Existing patterns to reuse
- `buildRowHTML(title, games)` — existing carousel factory, no changes needed
- `createGameCard()` — existing card HTML, no changes needed
- `@media (max-width: 600px)` block — add any mobile-specific snap overrides here if needed

### RTL notes
- `scroll-snap-align: start` — in RTL, "start" is the right edge, which is correct for RTL carousels
- No positional CSS (`left`/`right`) changes needed for any of these features
