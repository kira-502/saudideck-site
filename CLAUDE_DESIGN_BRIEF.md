# SaudiDeck — Context Brief for Claude Design

Paste this into your new Claude Design project's context (or upload as a file).
The codebase root is `C:/Users/mdoss/saudideck-site/`.

---

## What this is

**SaudiDeck** — Arabic RTL gaming library website. Subscribers get access to ~673 games across one Steam account. Currently live at https://saudideck.games. Static site.

## Tech stack — non-negotiable constraints

- **No build tools.** Vanilla HTML/CSS/JS only. No React, no bundler, no TypeScript.
- **Files:** `index.html`, `style.css`, `script.js`, `games.js` (data), `sw.js` (service worker).
- **Hosting:** Raspberry Pi 5 + nginx + Cloudflare. Deploy = `git pull`.
- **RTL Arabic** — `dir="rtl"`. First DOM child is rightmost visually.
- **Dark theme** — current palette: bg `#0a0a0a`, gold `#c9a84c`, accent green `#1a7a3c`, text `#f0f0f0`. Open to changes if they fit Arabic gaming aesthetic.
- **Font:** Thmanyah Sans (self-hosted, 5 weights: 300/400/500/700/900). Saudi typeface, keep it.
- **Mobile breakpoint:** 600px.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Library home — hero banner, filters, genre rows, request modal, stats strip |
| `guide-pc.html` | How-to guide for PC users |
| `guide-deck.html` | How-to guide for Steam Deck users |

## Behavior contracts that must survive a redesign

These have data dependencies — change the look freely, but the **data shape and JS hooks must remain compatible**.

### 1. Game data — `games.js`

```js
// 670+ games across:
const batches = [{ date: "YYYY-MM-DD", list: [...games] }, ...];   // Recently added drops
const comingSoonGames = [...];                                       // Upcoming releases
const baseLibrary = [...];                                           // The historical library
```

A released game object:
```js
{
  name: "Game Title",
  id: "1234567",                    // Steam app ID
  genre: "Action, RPG, Souls-like",  // Comma-separated
  year: 2024,
  score: 85,                         // Steam user-review % (0-100)
  verified: true,                    // Steam Deck Verified — optional
  release_date: "DD/MM/YYYY",        // Only for 2026 row
  cover: "co7dod"                    // IGDB cover ID — only when Steam CDN portrait is missing
}
```

### 2. Image sources

- **Released games:** Steam CDN `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{id}/library_600x900.jpg` (180×260 portrait)
- **2026 / Coming Soon games:** IGDB `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/{cover}.jpg`
- **Hero banner:** Steam CDN `library_hero.jpg` (1920×620 wide), falls back to `header.jpg`
- **Don't propose hosting our own images.**

### 3. Card link target

Each card links to `https://store.steampowered.com/app/{id}/` (opens Steam app or store page).

### 4. URL filter persistence

Filters serialize to query params: `?q=halo&genre=Action&sort=score_high&verified=1`. Don't break this.

### 5. Request-game modal

Form POSTs to `https://saudideck.online/api/game-requests` with `{ game, order_number }`. Modal must remain on `index.html`. Trigger button is in the header nav and footer.

### 6. Releases feed

`releases.json` is generated from `games.js` for an external Telegram bot. Don't propose changes that affect the data shape — the consumer is wired and live.

### 7. Service worker

`sw.js` pre-caches the shell + fonts + guide pages. Designs must work offline (the SW handles uncached navigations by falling back to `index.html`).

### 8. Reduced motion

CSS already respects `@media (prefers-reduced-motion: reduce)`. New animations should keep this in mind.

## Current sections on `index.html` (top to bottom)

1. **Header** — logo + nav buttons (Help dropdown, طلب لعبة, شراء العضوية)
2. **Geometric divider** (gold dashed line)
3. **Controls** — search input, mobile filter toggle, filters panel (genre / year / sort / "newly added" toggle / Deck Verified toggle)
4. **Hero banner** — rotating between (a) latest game spotlight from newest batch, (b) subscription pricing card
5. **Game grid** — multiple horizontal carousel rows: COMING SOON, ✦ 2026 ✦, fixed genres (Action, RPG, Horror, Open World, Shooter, Adventure), Recently Added, then random shuffled genre rows. "Load More" button reveals more genre rows.
6. **Stats strip** — 4 cells: total games, Verified count, newest game name, added this month
7. **Footer** — copyright, request-game button
8. **Floating scroll-to-top button** — bottom-left, fades in after 400px scroll

## Components to design (suggested)

If you want to hit every surface, these are what I'd port:
- **Game card** (default + hover + locked/coming-soon variants + Verified badge + Metacritic-style score badge)
- **Hero banner** (game spotlight slide + ad slide with pricing tiers)
- **Carousel row** (header + scroll arrows + cards + progress bar underneath)
- **Stats strip cell**
- **Filter chip / select / toggle**
- **Modal** (request-game form)
- **Mobile** versions of the above
- **Guide page** layout (used by `guide-pc.html` and `guide-deck.html`)

## Brand voice / vibe

- Premium but accessible — "curated, not bloated"
- Arabic copy is primary; some English allowed (genre tags, brand names like "Steam Deck")
- Gold + dark = the existing identity. Open to a different accent color but black is staying.

## What you can change

- Layout, spacing, type scale
- Color palette (suggest something Saudi-rooted that still works as gaming UI)
- Component shapes (radii, shadows, borders)
- Hero banner concept
- Loading states, empty states, error states
- Mobile patterns
- Navigation (currently a top bar — could be different)

## What you can't change

- The 8 behavior contracts above
- The static / no-build constraint
- RTL direction
- Any data shape in `games.js` or `releases.json`

## When you're done

Click **Export → Handoff to Claude Code → Send to local coding agent.** I'll receive the bundle and port the visual changes file-by-file, keeping all behaviors intact.
