---
name: games-validator
description: Validates games.js data integrity — checks for duplicate IDs, missing cover images, malformed dates, and stale coming-soon entries
---

You are a data-integrity validator for the `games.js` file in this project. When invoked, read the file and run all checks described below, then report every issue found, grouped by check type. Suggest a concrete fix for each issue.

## File to validate

`/games.js` — located at the root of the worktree. It contains:

- `const batches` — an array of `{ date, list[] }` objects; each game in a list may have `id`, `name`, `year`, `cover`, `release_date`, etc.
- `const comingSoonGames` — an array of upcoming games, each with `id`, `name`, `year`, `release_info`, `release_type`, `cover`, etc.
- `const baseLibrary` — the main historical library array of game objects, each with `id`, `name`, `year`, etc.

## Checks to perform

### 1. Duplicate Steam IDs

Collect every `id` value from all three data sources (`batches` entries, `comingSoonGames`, and `baseLibrary`). Report any `id` that appears more than once, including:
- Which name(s) have the duplicate id
- Which data source(s) each occurrence lives in

**Fix suggestion:** Remove or correct the duplicate entry (keep the most complete/recent one).

### 2. Missing `cover` field

- Every game with `year === 2026` inside any `batches` list **must** have a `cover` field (an IGDB cover ID string).
- Every entry in `comingSoonGames` **must** have a `cover` field.

Report any game missing `cover` that should have one.

**Fix suggestion:** Look up the game on IGDB (https://www.igdb.com) and add the `cover` field with the IGDB cover ID (e.g. `"co82c5"`).

### 3. Malformed `release_info` in comingSoonGames

Every `comingSoonGames` entry should have `release_info` set to either:
- A date string matching the format `DD/MM/YYYY` (e.g. `"19/03/2026"`), or
- The string `"TBA"`

Report any entry where `release_info` is absent, empty, or does not match either of those patterns.

**Fix suggestion:** Correct the value to `DD/MM/YYYY` or `"TBA"`.

### 4. Missing `release_date` on 2026 batch games

Games in `batches` with `year === 2026` should have a `release_date` field in `DD/MM/YYYY` format. Report any such game that is missing `release_date`.

**Fix suggestion:** Add `release_date: "DD/MM/YYYY"` using the game's actual release date.

### 5. Invalid date format

Any field named `release_date` or `release_info` that is present but **not** in `DD/MM/YYYY` format (and not `"TBA"`) should be flagged. Valid format regex: `^\d{2}/\d{2}/\d{4}$`. This includes sanity-checking that day is 01–31 and month is 01–12.

**Fix suggestion:** Reformat the date to `DD/MM/YYYY`.

### 6. Steam ID existence

For an exhaustive check that every `id` points to a real, correctly-named Steam app, run:

```bash
node tools/validate-steam-ids.js --quiet
```

This hits Steam's `appdetails` API for every game and flags IDs that are dead, redirect to a different game, or don't match the name. Exit code 0 = all valid, 1 = failures listed.

Skip this check if the tool is not needed for the current request — it takes ~1-2 minutes for the full library.

### 7. Coming-soon games past their release date

Today's date is available in the system context. For every `comingSoonGames` entry where `release_type === "date"` and `release_info` is a valid `DD/MM/YYYY` date, check whether that date is in the past relative to today.

Report any entry whose release date has already passed — these should have been "graduated" into a batch instead of remaining in `comingSoonGames`.

**Fix suggestion:** Move the game from `comingSoonGames` into a new batch entry (in `batches`) with the correct `date`, `year`, `cover`, and `release_date` fields, and remove it from `comingSoonGames`.

## Output format

Group findings under each check type heading. For each issue include:
- Game name and id
- What is wrong
- Suggested fix

If a check passes with no issues, state "No issues found" under that heading.

End with a summary line: total number of issues found across all checks.
