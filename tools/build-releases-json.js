#!/usr/bin/env node
// Generate releases.json from games.js — the contract feed for the
// Telegram announcement bot (and any future poll consumer).
//
// Schema: docs/RELEASES_API.md
// Output: ../releases.json (served at https://saudideck.games/releases.json)
//
// Auto-runs on games.js edits via .claude/settings.json hook.
// Run manually: node tools/build-releases-json.js

'use strict';

const fs = require('fs');
const path = require('path');

const GAMES_JS = path.join(__dirname, '..', 'games.js');
const OUT = path.join(__dirname, '..', 'releases.json');

const SCHEMA_VERSION = '1.0';
const RECENT_BATCH_LIMIT = 8; // ship up to 8 most-recent batches

function loadGames() {
    const src = fs.readFileSync(GAMES_JS, 'utf8');
    const sandbox = {};
    const wrapped = src + '\nthis.batches=batches; this.comingSoonGames=comingSoonGames;';
    new Function(wrapped).call(sandbox);
    return sandbox;
}

const steamUrl = (id) => `https://store.steampowered.com/app/${id}/`;

function imageUrl(g) {
    if (g.cover) return `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${g.cover}.jpg`;
    return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${g.id}/library_600x900.jpg`;
}

// Convert "DD/MM/YYYY" → "YYYY-MM-DD". Returns null for "TBA" or malformed input.
function ddmmyyyyToISO(s) {
    if (!s || typeof s !== 'string') return null;
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

const splitGenres = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean);

function normalizeReleased(g) {
    return {
        id: g.id,
        name: g.name,
        genre: g.genre || '',
        genres: splitGenres(g.genre),
        year: typeof g.year === 'number' ? g.year : parseInt(g.year, 10) || null,
        score: typeof g.score === 'number' ? g.score : null,
        verified: g.verified === true,
        cover: g.cover || null,
        release_date: g.release_date || null,
        release_iso: ddmmyyyyToISO(g.release_date),
        steam_url: steamUrl(g.id),
        image_url: imageUrl(g),
    };
}

function normalizeUpcoming(g) {
    return {
        id: g.id,
        name: g.name,
        genre: g.genre || '',
        genres: splitGenres(g.genre),
        year: g.year, // string in source, kept verbatim
        cover: g.cover || null,
        release_info: g.release_info,
        release_iso: ddmmyyyyToISO(g.release_info), // null when "TBA"
        release_type: g.release_type,
        steam_url: steamUrl(g.id),
        image_url: imageUrl(g),
    };
}

function main() {
    const { batches, comingSoonGames } = loadGames();

    const recent_additions = batches.slice(0, RECENT_BATCH_LIMIT).map((b) => ({
        batch_id: b.date,
        batch_date: b.date, // YYYY-MM-DD
        game_count: b.list.length,
        games: b.list.map(normalizeReleased),
    }));

    const coming_soon = comingSoonGames.map(normalizeUpcoming).sort((a, b) => {
        // Sort by release date ascending; TBA entries last
        const ai = a.release_iso || '9999-12-31';
        const bi = b.release_iso || '9999-12-31';
        return ai.localeCompare(bi);
    });

    const out = {
        schema_version: SCHEMA_VERSION,
        generated_at: new Date().toISOString(),
        site: 'https://saudideck.games',
        notes: 'released_today is not pre-computed. Consumers should derive it by filtering coming_soon where release_iso === today (in their preferred timezone).',
        recent_additions,
        coming_soon,
    };

    fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
    console.log(`releases.json: ${recent_additions.length} batches, ${coming_soon.length} upcoming`);
}

main();
