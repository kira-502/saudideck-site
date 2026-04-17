#!/usr/bin/env node
// Validate every Steam App ID in games.js against the Steam store.
// Flags dead / redirected / wrong IDs — the exact class of bug that caused
// 11 games to have broken images and no scores in earlier commits.
//
// Usage: node tools/validate-steam-ids.js [--quiet]
// Exit code: 0 on pass, 1 if any IDs are invalid.

'use strict';

const fs = require('fs');
const path = require('path');

const QUIET = process.argv.includes('--quiet');
const GAMES_JS = path.join(__dirname, '..', 'games.js');

// Load games.js in a VM-like context so we can read its top-level arrays
function loadGames() {
    const src = fs.readFileSync(GAMES_JS, 'utf8');
    const sandbox = {};
    const wrapped = src + '\nthis.batches=batches; this.comingSoonGames=comingSoonGames; this.baseLibrary=baseLibrary;';
    new Function(wrapped).call(sandbox);
    return sandbox;
}

function collectEntries({ batches, comingSoonGames, baseLibrary }) {
    const entries = [];
    batches.forEach((b) => b.list.forEach((g) => entries.push({ ...g, _source: `batches[${b.date}]` })));
    comingSoonGames.forEach((g) => entries.push({ ...g, _source: 'comingSoonGames' }));
    baseLibrary.forEach((g) => entries.push({ ...g, _source: 'baseLibrary' }));
    return entries;
}

// Hit Steam's review API — only 200 games succeed with total_reviews>0 OR the app exists
// If the app ID is wrong (redirected to a different game or deleted), we get an error
// or the response name mismatches.
async function validateId(id, expectedName) {
    try {
        const res = await fetch(
            `https://store.steampowered.com/api/appdetails?appids=${id}&filters=basic`,
            { headers: { 'User-Agent': 'saudideck-validator/1.0' } }
        );
        if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
        const json = await res.json();
        const entry = json[id];
        if (!entry || !entry.success || !entry.data) {
            return { ok: false, reason: 'Not found on Steam (app deleted or wrong ID)' };
        }
        const actualName = entry.data.name || '';
        // Loose name match — Steam names may have ™, ®, edition suffixes etc.
        const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const a = normalize(actualName);
        const b = normalize(expectedName);
        if (a !== b && !a.includes(b.slice(0, 10)) && !b.includes(a.slice(0, 10))) {
            return { ok: false, reason: `Name mismatch — Steam says "${actualName}"`, actualName };
        }
        return { ok: true };
    } catch (err) {
        return { ok: false, reason: `Network error: ${err.message}` };
    }
}

async function main() {
    const data = loadGames();
    const entries = collectEntries(data);
    if (!QUIET) console.log(`Validating ${entries.length} Steam IDs...`);

    const failures = [];
    const CONCURRENCY = 8;
    let idx = 0;

    async function worker() {
        while (idx < entries.length) {
            const i = idx++;
            const entry = entries[i];
            const result = await validateId(entry.id, entry.name);
            if (!result.ok) {
                failures.push({ ...entry, _reason: result.reason });
                if (!QUIET) process.stdout.write('x');
            } else if (!QUIET) {
                process.stdout.write('.');
            }
        }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    if (!QUIET) console.log('\n');

    if (failures.length === 0) {
        console.log(`✓ All ${entries.length} Steam IDs valid`);
        process.exit(0);
    }

    console.log(`✗ ${failures.length} invalid Steam ID${failures.length === 1 ? '' : 's'}:\n`);
    failures.forEach((f) => {
        console.log(`  [${f._source}] "${f.name}" (id: ${f.id})`);
        console.log(`    → ${f._reason}`);
    });
    process.exit(1);
}

main();
