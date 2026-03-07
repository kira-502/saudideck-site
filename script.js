/* =========================================
   1. GLOBAL VARIABLES & INIT
   ========================================= */
let allGames = [];
let visibleGames = [];
const BATCH_SIZE = 20;
let currentLimit = BATCH_SIZE;

// Mapping for Genre Dropdown
const GENRE_MAPPING = {
    "Action": "آكشن",
    "Adventure": "مغامرات",
    "RPG": "أر بي جي",
    "Simulation": "محاكاة",
    "Strategy": "استراتيجية",
    "Sports": "رياضة",
    "Racing": "سباق",
    "Fighting": "قتال",
    "Horror": "رعب",
    "Puzzle": "ألغاز",
    "Shooter": "شوتر",
    "Platformer": "بلاتفورمر",
    "Open World": "عالم مفتوح"
};

document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    const comingSoonWithFlag = comingSoonGames.map(g => ({ ...g, isComingSoon: true }));
    allGames = [...comingSoonWithFlag, ...games];
    populateGenreFilter();
    populateYearFilter();
    resetAndRender();
}

/* =========================================
   2. FILTERS & SORTING
   ========================================= */
function populateGenreFilter() {
    const genreSelect = document.getElementById('genreFilter');
    const genres = new Set();
    allGames.forEach(g => {
        if (g.genre) g.genre.split(',').forEach(gen => genres.add(gen.trim()));
    });
    Array.from(genres).sort().forEach(g => {
        const option = document.createElement('option');
        option.value = g;
        option.textContent = GENRE_MAPPING[g] || g;
        genreSelect.appendChild(option);
    });
}

function populateYearFilter() {
    const yearSelect = document.getElementById('yearFilter');
    const years = new Set(allGames.map(g => g.year).filter(y => y));
    Array.from(years).sort((a, b) => b - a).forEach(y => {
        const option = document.createElement('option');
        option.value = y;
        option.textContent = y;
        yearSelect.appendChild(option);
    });
}

function toggleFilters() {
    document.getElementById('filtersPanel').classList.toggle('active');
}

function toggleVerifiedFilter() {
    document.getElementById('verifiedToggleBtn').classList.toggle('active');
    resetAndRender();
}

/* =========================================
   3. SEARCH & DEBOUNCE
   ========================================= */
let searchTimeout;

function debouncedSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        resetAndRender();
    }, 300);
}

/* =========================================
   4. CORE RENDERING ENGINE
   ========================================= */
function resetAndRender() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const genre = document.getElementById('genreFilter').value;
    const year = document.getElementById('yearFilter').value;
    const sort = document.getElementById('sortFilter').value;
    const verifiedOnly = document.getElementById('verifiedFilter').checked;

    visibleGames = allGames.filter(g => {
        const matchesSearch = (g.name || "").toLowerCase().includes(search);
        const matchesGenre = genre === 'All' || (g.genre && g.genre.includes(genre));
        const matchesYear = year === 'All' || g.year == year;
        const matchesVerified = !verifiedOnly || g.verified;
        return matchesSearch && matchesGenre && matchesYear && matchesVerified;
    });

    if (sort === 'newest') visibleGames.sort((a, b) => b.year - a.year);
    else if (sort === 'oldest') visibleGames.sort((a, b) => a.year - b.year);
    else if (sort === 'az') visibleGames.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'date_added') visibleGames.sort((a, b) => (b.date_added || "").localeCompare(a.date_added || ""));
    else {
        // SMART DEFAULT SORT
        const currentYear = new Date().getFullYear();
        const demotedIds = ["2179850", "1148760"];
        visibleGames.sort((a, b) => {
            const aDemoted = demotedIds.includes(a.id);
            const bDemoted = demotedIds.includes(b.id);
            if (aDemoted && !bDemoted) return 1;
            if (!aDemoted && bDemoted) return -1;
            if (a.isComingSoon && !b.isComingSoon) return -1;
            if (!a.isComingSoon && b.isComingSoon) return 1;
            const aIsRecentHit = (parseInt(a.year) >= currentYear - 5) && ((a.score || 0) >= 80);
            const bIsRecentHit = (parseInt(b.year) >= currentYear - 5) && ((b.score || 0) >= 80);
            if (aIsRecentHit && !bIsRecentHit) return -1;
            if (!aIsRecentHit && bIsRecentHit) return 1;
            return (b.score || 0) - (a.score || 0);
        });
    }

    currentLimit = BATCH_SIZE;
    renderGrid();
}

function renderGrid() {
    const grid = document.getElementById('gameGrid');
    grid.innerHTML = '';
    
    // Check if any filter or search is active
    const search = document.getElementById('searchInput').value.trim();
    const genre = document.getElementById('genreFilter').value;
    const year = document.getElementById('yearFilter').value;
    const sort = document.getElementById('sortFilter').value;
    const verifiedOnly = document.getElementById('verifiedFilter').checked;
    
    const isFilterActive = search !== "" || genre !== "All" || year !== "All" || verifiedOnly || sort !== "metacritic";

    if (visibleGames.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);"><h3 style="color:var(--text);">لم يتم العثور على نتائج 😔</h3><p>جرب تغيير فلاتر البحث أو <a href="#" onclick="openRequestModal()" style="color:var(--gold)">اطلب اللعبة</a></p></div>`;
        document.getElementById('loadMoreArea').style.display = 'none';
        return;
    }

    if (isFilterActive) {
        // --- FALLBACK GRID MODE ---
        grid.classList.add('grid-fallback');
        grid.innerHTML = `<div style="grid-column: 1/-1; color: var(--gold); font-size: 1.1rem; margin-bottom: 10px;">نتائج البحث: ${visibleGames.length} لعبة</div>`;
        
        const toShow = visibleGames.slice(0, currentLimit);
        toShow.forEach(game => {
            grid.innerHTML += createGameCard(game);
        });
        
        document.getElementById('loadMoreArea').style.display = currentLimit >= visibleGames.length ? 'none' : 'block';
    } else {
        // --- NETFLIX ROWS MODE ---
        grid.classList.remove('grid-fallback');
        let html = '';
        
        // 1. Coming Soon Row
        const comingSoon = visibleGames.filter(g => g.isComingSoon);
        if (comingSoon.length > 0) {
            if (comingSoon.length <= 2) {
                html += buildSpotlightHTML("COMING SOON", comingSoon);
            } else {
                html += buildRowHTML("COMING SOON", comingSoon.slice(0, currentLimit), 'coming-soon');
            }
        }
        
        // 1.5. 2026 Row
        const games2026 = visibleGames.filter(g => !g.isComingSoon && parseInt(g.year) === 2026);
        if (games2026.length > 0) {
            if (games2026.length <= 2) {
                html += buildSpotlightHTML("✦ 2026 ✦", games2026);
            } else {
                html += buildRowHTML("✦ 2026 ✦", games2026.slice(0, currentLimit), '2026', true);
            }
        }
        
        // 2. Genre Rows
        const genres = Object.keys(GENRE_MAPPING);
        genres.forEach(gKey => {
            const matches = visibleGames.filter(g => !g.isComingSoon && g.genre && g.genre.includes(gKey));
            if (matches.length > 0) {
                if (matches.length <= 2) {
                    html += buildSpotlightHTML(gKey.toUpperCase(), matches);
                } else {
                    html += buildRowHTML(gKey.toUpperCase(), matches.slice(0, currentLimit), gKey);
                }
            }
        });
        
        grid.innerHTML = html;
        
        // Attach scroll events
        document.querySelectorAll('.row-carousel').forEach(row => {
            row.addEventListener('scroll', () => {
                const fill = row.parentElement.parentElement.querySelector('.row-progress-fill');
                if (!fill) return;
                let scrollRange = row.scrollWidth - row.clientWidth;
                // Avoid division by zero when content perfectly fits
                if (scrollRange <= 0) scrollRange = 1;
                const percent = (row.scrollLeft / scrollRange) * 100;
                fill.style.width = percent + '%';
            });
        });

        // Stagger animation timing
        document.querySelectorAll('.genre-row').forEach((row, i) => {
            row.style.animationDelay = `${i * 80}ms`;
        });
        
        // Hide load more if all rows reached their max
        let maxMatches = Math.max(comingSoon.length, games2026.length);
        genres.forEach(gKey => {
            const m = visibleGames.filter(g => !g.isComingSoon && g.genre && g.genre.includes(gKey)).length;
            if (m > maxMatches) maxMatches = m;
        });
        
        document.getElementById('loadMoreArea').style.display = currentLimit >= maxMatches ? 'none' : 'block';
    }
}

function buildSpotlightHTML(title, games) {
    let html = `
    <div class="genre-row">
        <div class="genre-header">${title}</div>
        <div style="display: flex; gap: 30px; justify-content: center; flex-wrap: wrap;">
    `;
    games.forEach(game => {
        html += createGameCard(game).replace('class="game-card', 'class="game-card" style="width: 240px; height: 346px; flex: 0 0 240px;" data-dummy="');
    });
    html += `</div></div>`;
    return html;
}

function buildRowHTML(title, games, idPrefix, isSpecial = false) {
    const rowId = 'row-' + idPrefix.replace(/\s+/g, '-').toLowerCase();
    let cardsHtml = games.map(g => createGameCard(g)).join('');
    
    const headerHtml = isSpecial 
        ? `<div class="genre-header" style="border-left: none; padding-left: 0; margin-left: 15px;"><span style="border: 1px solid var(--gold); padding: 4px 14px; border-radius: 4px; color: var(--gold); display: inline-block; letter-spacing: 2px;">${title}</span></div>` 
        : `<div class="genre-header">${title}</div>`;
    
    return `
        <div class="genre-row">
            ${headerHtml}
            <div class="row-carousel-container">
                <button class="scroll-btn scroll-left" onclick="scrollRow('${rowId}', -800)">❮</button>
                <div class="row-carousel" id="${rowId}">
                    ${cardsHtml}
                </div>
                <button class="scroll-btn scroll-right" onclick="scrollRow('${rowId}', 800)">❯</button>
            </div>
            <div class="row-progress"><div class="row-progress-fill"></div></div>
        </div>
    `;
}

window.scrollRow = function(rowId, amount) {
    const row = document.getElementById(rowId);
    if(row) {
        row.scrollBy({ left: amount, behavior: 'smooth' });
    }
}

function loadMore() {
    currentLimit += BATCH_SIZE;
    renderGrid();
}

/* =========================================
   5. HTML GENERATION (CARDS)
   ========================================= */
function createGameCard(game) {
    // 1. Image Logic: Prioritize manual 'image' (Coming Soon), else High-Res Steam
    const imgUrl = game.image || `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.id}/library_600x900.jpg`;

    // 2. Link Logic: IGDB Slug
    let slug = game.slug;
    if (!slug) {
        slug = game.name.toLowerCase().replace(/:/g, '').replace(/'/g, '').replace(/#/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    const targetUrl = `https://www.igdb.com/games/${slug}`;

    // 3. Badges
    let badgesHtml = game.verified ? `<div class="badge"><img src="assets/badge_verified.png" alt="Verified"></div>` : '';
    let dateTag = '';
    if (game.year == 2026) {
        if (game.release_date) {
            dateTag = `<div class="date-tag">${game.release_date}</div>`;
        }
    } else if (game.date_added) {
        dateTag = `<div class="date-tag new-tag">NEW ${game.date_added.slice(5)} '${game.date_added.slice(2,4)}</div>`;
    }

    // 4. Coming Soon Logic (Static)
    let lockedClass = "";
    let lockedOverlay = "";
    if (game.isComingSoon) {
        lockedClass = "locked";
        lockedOverlay = `
            <div class="locked-overlay">
                <div class="release-capsule">
                    <span style="color:var(--accent); font-weight:800; letter-spacing:1px;">COMING SOON</span>
                    <span style="border-left:1px solid #444; padding-left:8px; margin-left:8px;">${game.release_info}</span>
                </div>
            </div>`;
    }

    // 5. HTML (Clickable Link)
    let scoreClass = 'score-low';
    if (game.score >= 85) scoreClass = 'score-great';
    else if (game.score >= 70) scoreClass = 'score-mid';
    const mcScore = game.score ? `<div class="metacritic-score ${scoreClass}">${game.score}</div>` : '';
    
    return `
        <a href="${targetUrl}" target="_blank" class="game-card ${lockedClass}">
            <div class="game-image-container">
                <img src="${imgUrl}" alt="${game.name}" class="game-img" loading="lazy" onerror="this.src='https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.id}/header.jpg'">
                ${lockedOverlay}
                <div class="overlay">${badgesHtml}</div>
                ${dateTag}
                ${mcScore}
            </div>
            <div class="game-info">
                <h3 class="game-title" title="${game.name}">${game.name}</h3>
                <div class="game-meta">
                    <span>${game.year}</span>
                </div>
                <div class="game-genre" title="${game.genre}">${game.genre || ''}</div>
            </div>
        </a>
    `;
}

/* =========================================
   6. MODALS & INTERACTIONS
   ========================================= */
function openRequestModal() {
    const searchVal = document.getElementById('searchInput').value;
    if (searchVal) {
        document.getElementById('gameName').value = searchVal;
    }
    document.getElementById('requestOverlay').classList.add('active');
}

function closeRequestModal() {
    document.getElementById('requestOverlay').classList.remove('active');
}

async function handleRequestSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('requestSubmitBtn');
    const originalText = btn.innerText;
    const form = e.target;
    const formData = new FormData(form);

    // YOUR GOOGLE SCRIPT URL
    const scriptURL = 'https://script.google.com/macros/s/AKfycbwfdbLb4OBTf_YDoFm70ZtnXsu6351ADQlAiCP8iQ0z_XTchp-3myOnoPo9aDkjwlnx/exec';

    btn.innerText = "جارٍ الإرسال...";
    btn.disabled = true;

    try {
        await fetch(scriptURL, { method: 'POST', body: formData });
        alert("تم إرسال طلبك بنجاح! سيتم مراجعته قريباً.");
        closeRequestModal();
        form.reset();
    } catch (error) {
        console.error('Error!', error.message);
        alert("حدث خطأ في الاتصال، يرجى المحاولة مرة أخرى.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

function toggleNewlyAdded() {
    const btn = document.getElementById('newlyAddedBtn');
    const select = document.getElementById('sortFilter');
    if (select.value === 'date_added') {
        select.value = 'metacritic';
        btn.classList.remove('active');
    } else {
        select.value = 'date_added';
        btn.classList.add('active');
    }
    resetAndRender();
}
