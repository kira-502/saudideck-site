# SaudiDeck Releases Feed — `releases.json`

Static JSON feed published at:

```
https://saudideck.games/releases.json
```

Served by nginx behind Cloudflare. **Use `If-Modified-Since` for conditional requests** — Cloudflare's DYNAMIC cache mode strips the `ETag` header but preserves `Last-Modified`. Verified: a replay with the previous `Last-Modified` value returns `304 Not Modified`.

**Cache headers:** none beyond nginx defaults. Polling every hour costs us nothing.

**Updates:** regenerated every time `games.js` changes (auto via Claude Code hook), redeployed on `git pull`. Fields below are stable; `schema_version` will bump on breaking changes.

---

## Top-level shape

```json
{
  "schema_version": "1.0",
  "generated_at": "2026-04-25T21:56:20.171Z",
  "site": "https://saudideck.games",
  "notes": "released_today is not pre-computed. Consumers should derive it by filtering coming_soon where release_iso === today (in their preferred timezone).",
  "recent_additions": [ /* up to 8 most-recent batches */ ],
  "coming_soon": [ /* all upcoming, sorted by release_iso asc, TBA last */ ]
}
```

---

## `recent_additions`

Array of batches, newest first. Each batch is one "drop" — the games added on a given date. Shape:

```json
{
  "batch_id": "2026-04-13",
  "batch_date": "2026-04-13",
  "game_count": 2,
  "games": [ /* see Released Game shape below */ ]
}
```

**Diff hint:** use `batch_id` (= the date string, unique per batch) as the dedup key for "have I announced this batch yet?" idempotency.

### Released Game shape (real example)

```json
{
  "id": "3634520",
  "name": "Samson",
  "genre": "Action, Adventure, Brawler, Open World",
  "genres": ["Action", "Adventure", "Brawler", "Open World"],
  "year": 2026,
  "score": 65,
  "verified": false,
  "cover": "coay8a",
  "release_date": "08/04/2026",
  "release_iso": "2026-04-08",
  "steam_url": "https://store.steampowered.com/app/3634520/",
  "image_url": "https://images.igdb.com/igdb/image/upload/t_cover_big_2x/coay8a.jpg"
}
```

Field reference:

| Field | Type | Notes |
|---|---|---|
| `id` | string | Steam app ID |
| `name` | string | As shown on the site |
| `genre` | string | Comma-separated, source-of-truth |
| `genres` | string[] | Pre-split convenience array |
| `year` | number \| null | Release year |
| `score` | number \| null | Steam user-review % (0–100) |
| `verified` | boolean | Steam Deck Verified |
| `cover` | string \| null | IGDB cover ID — only set for newer titles where Steam CDN portrait is missing |
| `release_date` | string \| null | `DD/MM/YYYY` — set only for 2026-and-later games |
| `release_iso` | string \| null | ISO-formatted version of `release_date` for easier sorting/comparison |
| `steam_url` | string | Direct Steam store link |
| `image_url` | string | HTTPS, Telegram-fetchable. IGDB URL when `cover` is set, otherwise Steam CDN portrait |

---

## `coming_soon`

Array of upcoming games, sorted ascending by `release_iso`. TBA entries (no date yet) sort last.

### Upcoming Game shape (real example)

```json
{
  "id": "3357650",
  "name": "Pragmata",
  "genre": "Action, Adventure, Sci-Fi, Atmospheric, Singleplayer",
  "genres": ["Action", "Adventure", "Sci-Fi", "Atmospheric", "Singleplayer"],
  "year": "2026",
  "cover": "co9wwv",
  "release_info": "16/04/2026",
  "release_iso": "2026-04-16",
  "release_type": "date",
  "steam_url": "https://store.steampowered.com/app/3357650/",
  "image_url": "https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co9wwv.jpg"
}
```

Field reference:

| Field | Type | Notes |
|---|---|---|
| `id` | string | Steam app ID |
| `name` | string | As shown on the site |
| `genre` | string | Comma-separated |
| `genres` | string[] | Pre-split convenience array |
| `year` | string | Verbatim from source — typically `"2026"` |
| `cover` | string \| null | IGDB cover ID. **Required** for upcoming entries; if null, treat as a data bug on our side |
| `release_info` | string | `DD/MM/YYYY` or `"TBA"` |
| `release_iso` | string \| null | `null` when `release_info` is `"TBA"` |
| `release_type` | string | Always `"date"` currently |
| `steam_url` | string | Direct Steam store link |
| `image_url` | string | HTTPS, Telegram-fetchable. IGDB cover if set, else Steam CDN portrait |

---

## Deriving `released_today`

Not in the feed. Compute it consumer-side from `coming_soon`:

```python
from datetime import datetime, timezone, timedelta

# KSA = UTC+3, no DST
ksa_today = (datetime.now(timezone.utc) + timedelta(hours=3)).date().isoformat()

released_today = [g for g in feed["coming_soon"] if g.get("release_iso") == ksa_today]
```

Why not server-side? Date math depends on consumer timezone (KSA for the bot, NY for our auto-graduation logic, possibly UTC for future consumers). Keeping it consumer-side avoids ambiguity.

---

## Polling pattern (recommended)

Use `Last-Modified` (ETag is unavailable behind Cloudflare):

```python
import os, requests

LM_FILE = "releases_last_modified.txt"

last_modified = open(LM_FILE).read().strip() if os.path.exists(LM_FILE) else None
headers = {"If-Modified-Since": last_modified} if last_modified else {}

r = requests.get("https://saudideck.games/releases.json", headers=headers, timeout=10)
if r.status_code == 304:
    return  # unchanged, nothing to do
r.raise_for_status()

with open(LM_FILE, "w") as f:
    f.write(r.headers.get("Last-Modified", ""))

feed = r.json()
# diff feed["recent_additions"] by batch_id, fire DMs for new batches
```

---

## Idempotency keys

| Bucket | Recommended key |
|---|---|
| `recent_additions` (weekly digest) | `batch_id` |
| `recent_additions` (per-game, if you ever break out) | `(batch_id, game.id)` |
| `coming_soon` graduations | `game.id` (a coming-soon entry only graduates once) |

---

## Schema versioning

Breaking changes (renaming a field, removing a field) → bump `schema_version` major (e.g. `1.0` → `2.0`) and announce here before deploying. Additive changes (new fields, new top-level keys) keep the same `schema_version`.

If `schema_version` is missing or unrecognized, treat as broken and don't dispatch — log + alert.
