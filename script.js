/* =========================================
   1. GLOBAL VARIABLES & INIT
   ========================================= */
let allGames = [];
let visibleGames = [];
const BATCH_SIZE = 5;
let currentLimit = BATCH_SIZE;
let _shuffledGenres = [];
const FIXED_GENRES = ['Action', 'RPG', 'Horror', 'Open World', 'Shooter', 'Adventure'];
const _cardCache = new Map();

// Cached DOM references (populated after DOMContentLoaded)
let $searchInput, $genreFilter, $yearFilter, $sortFilter, $verifiedFilter, $gameGrid, $loadMoreArea, $filtersPanel;

const GENRE_MAPPING = {
    "Action": "آكشن", "Adventure": "مغامرات", "RPG": "أر بي جي", "Simulation": "محاكاة",
    "Strategy": "استراتيجية", "Sports": "رياضة", "Racing": "سباق", "Fighting": "قتال",
    "Horror": "رعب", "Puzzle": "ألغاز", "Shooter": "شوتر", "Platformer": "بلاتفورمر",
    "Open World": "عالم مفتوح"
};
// Reverse lookup: typing Arabic genre → matches English genre strings in data
const GENRE_MAPPING_AR_TO_EN = Object.fromEntries(
    Object.entries(GENRE_MAPPING).map(([en, ar]) => [ar, en])
);

// Scroll to top on page load/reload
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

document.addEventListener('DOMContentLoaded', () => {
    $searchInput = document.getElementById('searchInput');
    $genreFilter = document.getElementById('genreFilter');
    $yearFilter = document.getElementById('yearFilter');
    $sortFilter = document.getElementById('sortFilter');
    $verifiedFilter = document.getElementById('verifiedFilter');
    $gameGrid = document.getElementById('gameGrid');
    $loadMoreArea = document.getElementById('loadMoreArea');
    $filtersPanel = document.getElementById('filtersPanel');

    // Delegated scroll listener for carousel progress bars (once, not per-render)
    $gameGrid.addEventListener('scroll', (e) => {
        if (!e.target.classList.contains('row-carousel')) return;
        const fill = e.target.parentElement.parentElement.querySelector('.row-progress-fill');
        if (!fill) return;
        const scrollRange = e.target.scrollWidth - e.target.clientWidth;
        if (scrollRange <= 0) return;
        fill.style.width = ((Math.abs(e.target.scrollLeft) / scrollRange) * 100) + '%';
    }, true);

    // Show/hide scroll-top button based on window scroll position
    const scrollTopBtn = document.querySelector('.scroll-top');
    if (scrollTopBtn) {
        let scrollTicking = false;
        window.addEventListener('scroll', () => {
            if (scrollTicking) return;
            scrollTicking = true;
            requestAnimationFrame(() => {
                scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
                scrollTicking = false;
            });
        }, { passive: true });
    }

    // Delegated click handlers for genre row headers and carousel arrows
    // (avoids inline onclick, safely handles genres with apostrophes like "Beat 'em up")
    $gameGrid.addEventListener('click', (e) => {
        const scrollBtn = e.target.closest('[data-scroll-row]');
        if (scrollBtn) {
            const row = document.getElementById(scrollBtn.dataset.scrollRow);
            if (row) row.scrollBy({ left: Number(scrollBtn.dataset.scrollAmount), behavior: 'smooth' });
            return;
        }
        const header = e.target.closest('.genre-header.clickable[data-genre]');
        if (header) {
            $genreFilter.value = header.dataset.genre;
            resetAndRender();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // Help dropdown: accessible toggle + aria-expanded sync
    const dropdown = document.getElementById('helpDropdown');
    const dropdownBtn = document.getElementById('helpDropdownBtn');
    if (dropdown && dropdownBtn) {
        const setExpanded = (open) => {
            dropdown.classList.toggle('open', open);
            dropdownBtn.setAttribute('aria-expanded', String(open));
        };
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            setExpanded(dropdownBtn.getAttribute('aria-expanded') !== 'true');
        });
        dropdown.addEventListener('mouseenter', () => setExpanded(true));
        dropdown.addEventListener('mouseleave', () => setExpanded(false));
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) setExpanded(false);
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') setExpanded(false);
        });
    }

    init();
});

// Parse "DD/MM/YYYY" → Date (midnight New York time, auto EST/EDT)
function parseReleaseDate(s) {
    const p = (s || '').split('/');
    if (p.length !== 3) return null;
    const [d, m, y] = p.map(Number);
    // Detect NY offset on that day using noon UTC (avoids DST boundary edge cases)
    const noonUTC = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const nyHour = parseInt(noonUTC.toLocaleString('en-US', { timeZone: 'America/New_York', hour: '2-digit', hour12: false }));
    const nyOffset = nyHour - 12; // -4 (EDT) or -5 (EST)
    return new Date(Date.UTC(y, m - 1, d, -nyOffset, 0, 0)); // midnight NY expressed as UTC
}

function formatCountdown(ms) {
    const t = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(t / 86400);
    const h = Math.floor((t % 86400) / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    return `${d}d ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
}

let _countdownIntervals = {};

function stopCountdownTimers() {
    Object.values(_countdownIntervals).forEach(id => clearInterval(id));
    _countdownIntervals = {};
}

function startCountdownTimers() {
    stopCountdownTimers();
    if (document.hidden) return; // Skip setup when hidden; visibilitychange will restart

    document.querySelectorAll('.countdown-badge').forEach(el => {
        const gameId = el.dataset.gameid;
        const game = allGames.find(g => g.id === gameId);
        if (!game || !game.release_info) return;

        const tick = () => {
            const releaseDate = parseReleaseDate(game.release_info);
            if (!releaseDate) {
                clearInterval(_countdownIntervals[gameId]);
                delete _countdownIntervals[gameId];
                el.textContent = '';
                return;
            }
            const diff = releaseDate.getTime() - Date.now();
            if (diff <= 0) {
                clearInterval(_countdownIntervals[gameId]);
                delete _countdownIntervals[gameId];
                el.textContent = 'OUT NOW';
                return;
            }
            el.textContent = formatCountdown(diff);
        };
        tick();
        _countdownIntervals[gameId] = setInterval(tick, 1000);
    });
}

// Pause countdown intervals when tab is hidden (saves battery); resume when visible
document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopCountdownTimers();
    else startCountdownTimers();
});

function init() {
    const now = Date.now();

    const comingSoonWithFlag = comingSoonGames.map(g => {
        const game = { ...g, isComingSoon: true };
        if (g.release_info && g.release_type === 'date') {
            const releaseDate = parseReleaseDate(g.release_info);
            if (releaseDate && now >= releaseDate.getTime()) {
                // Auto-graduate: treat as released, display only
                game.isComingSoon = false;
                game.year = 2026;
                game.release_date = g.release_info;
                // Convert DD/MM/YYYY → YYYY-MM-DD so the Recently Added row picks it up
                const [d, m, y] = g.release_info.split('/');
                if (d && m && y) game.date_added = `${y}-${m}-${d}`;
            }
        }
        return game;
    });
    allGames = [...comingSoonWithFlag, ...games];
    buildHeroBanner();
    buildStatsStrip();
    populateGenreFilter();
    populateYearFilter();
    applyURLFilters();
    resetAndRender();
}

/* =========================================
   HERO BANNER — Najd Night
   ========================================= */
const PRICING_TIERS = [
    { duration: 'شهر',    price: '30',  was: '70',  note: 'تجربة' },
    { duration: '3 أشهر', price: '79',  was: '119', note: 'الأكثر شيوعاً', featured: true },
    { duration: '6 أشهر', price: '120', was: '160', note: 'توفير 30%' },
    { duration: 'سنة',    price: '259', was: '299', note: 'أفضل قيمة' }
];

const HERO_BUY_URL = 'https://saudideck.com/en/600-games-on-one-account-saudideck-membership/p444700950?from=search-bar';

function buildHeroBanner() {
    const el = document.getElementById('hero-banner');
    if (!el || !batches || !batches.length) return;

    const batch = batches[0];
    const game = [...batch.list].sort((a, b) => (b.score || 0) - (a.score || 0))[0];
    if (!game) return;

    const heroUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.id}/library_hero.jpg`;
    const fallbackUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.id}/header.jpg`;

    const prelink = document.createElement('link');
    prelink.rel = 'preload'; prelink.as = 'image'; prelink.href = heroUrl;
    document.head.appendChild(prelink);

    // Hero meta tags (genre + year)
    const firstGenre = game.genre ? game.genre.split(',')[0].trim() : '';
    const tagGenre = firstGenre ? `<span class="hero-tag">${escAttr(firstGenre)}</span>` : '';
    const tagYear = game.year ? `<span class="hero-tag">${game.year}</span>` : '';
    const score = game.score
        ? `<span class="hero-score"><b>${game.score}</b><small>/100</small></span>`
        : '';

    const totalGames = allGames.filter(g => !g.isComingSoon).length;

    const tiersHtml = PRICING_TIERS.map(t => `
        <div class="tier ${t.featured ? 'featured' : ''}">
            <div class="duration">${escAttr(t.duration)}</div>
            <div class="price"><b>${escAttr(t.price)}</b><span class="sar">SAR</span></div>
            <div class="was">${escAttr(t.was)} ر.س</div>
            <div class="note">${escAttr(t.note)}</div>
        </div>
    `).join('');

    el.innerHTML = `
        <div class="hero-stage">
            <!-- Slide 1: Spotlight -->
            <div class="hero-slide active">
                <div class="hero-bg">
                    <img class="hero-bg-img" src="${heroUrl}" alt="" aria-hidden="true" onerror="this.onerror=null;this.src='${fallbackUrl}'">
                </div>
                <div class="hero-noise" aria-hidden="true"></div>
                <div class="hero-content">
                    <div class="hero-eyebrow">
                        <span class="pulse" aria-hidden="true"></span>
                        <span>NEW · أُضيفت حديثاً</span>
                    </div>
                    <h1 class="hero-title">${escAttr(game.name)}</h1>
                    <div class="hero-meta">${score}${tagGenre}${tagYear}</div>
                    <a class="hero-cta" href="https://store.steampowered.com/app/${game.id}/" target="_blank" rel="noopener">
                        فتح في Steam
                        <span aria-hidden="true">↖</span>
                    </a>
                </div>
            </div>

            <!-- Slide 2: Pricing -->
            <div class="hero-slide">
                <div class="hero-ad">
                    <div class="hero-ad-left">
                        <span class="eyebrow">SaudiDeck Membership</span>
                        <h2>${totalGames}+ لعبة. حساب واحد. اشتراك واحد.</h2>
                        <p>وصول كامل لمكتبة Steam Deck و PC، خدمة عربية أصيلة، تفعيل فوري.</p>
                        <a class="hero-cta" href="${HERO_BUY_URL}" target="_blank" rel="noopener">
                            ابدأ الاشتراك ←
                        </a>
                    </div>
                    <div class="hero-ad-tier-row">${tiersHtml}</div>
                </div>
            </div>
        </div>

        <div class="hero-dots" role="tablist">
            <button class="hero-dot active" data-slide="0" aria-label="عرض اللعبة"></button>
            <button class="hero-dot" data-slide="1" aria-label="عرض الباقات"></button>
        </div>
    `;

    // Slide rotation
    const slides = el.querySelectorAll('.hero-slide');
    const dots = el.querySelectorAll('.hero-dot');
    let current = 0;

    function goToSlide(i) {
        slides[current].classList.remove('active');
        dots[current].classList.remove('active');
        current = i;
        slides[current].classList.add('active');
        dots[current].classList.add('active');
    }

    dots.forEach(dot => dot.addEventListener('click', () => goToSlide(Number(dot.dataset.slide))));

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setInterval(() => goToSlide((current + 1) % slides.length), 6500);
    }
}

/* =========================================
   LIBRARY STATS STRIP — Najd Night
   ========================================= */
function buildStatsStrip() {
    const el = document.getElementById('stats-strip');
    if (!el || !allGames.length) return;

    const thisMonth = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }).slice(0, 7);

    const totalGames = allGames.filter(g => !g.isComingSoon).length;
    const verifiedCount = allGames.filter(g => g.verified && !g.isComingSoon).length;
    const newestGameName = [...batches[0].list].sort((a, b) => (b.score || 0) - (a.score || 0))[0].name;
    const addedThisMonth = allGames.filter(g =>
        g.date_added && g.date_added.slice(0, 7) === thisMonth
    ).length;
    const verifiedPct = totalGames > 0 ? Math.round((verifiedCount / totalGames) * 100) : 0;

    const stats = [
        { value: totalGames, label: 'إجمالي الألعاب', cls: '' },
        { value: verifiedCount, label: 'Steam Deck Verified', cls: '', sub: `${verifiedPct}% من المكتبة` },
        { value: newestGameName, label: 'أحدث إضافة', cls: 'stat-name' },
        { value: addedThisMonth, label: 'هذا الشهر', cls: '' },
    ];

    el.innerHTML = stats.map(s => `
        <div class="stat-cell ${s.cls}">
            <span class="stat-number">${escAttr(s.value)}</span>
            <span class="stat-label">${s.label}</span>
        </div>
    `).join('');
}

/* =========================================
   2. FILTERS & SORTING
   ========================================= */
function populateGenreFilter() {
    const genreSelect = $genreFilter;
    const genres = new Set();
    allGames.forEach(g => { if (g.genre) g.genre.split(',').forEach(gen => genres.add(gen.trim())); });
    Array.from(genres).sort().forEach(g => {
        const option = document.createElement('option');
        option.value = g; option.textContent = GENRE_MAPPING[g] || g;
        genreSelect.appendChild(option);
    });
}

function populateYearFilter() {
    const yearSelect = $yearFilter;
    // Coerce to number so "2026" (string, from comingSoonGames) and 2026 (number, from batches)
    // dedupe into a single dropdown entry
    const years = new Set(allGames.map(g => parseInt(g.year, 10)).filter(y => Number.isFinite(y)));
    Array.from(years).sort((a, b) => b - a).forEach(y => {
        const option = document.createElement('option');
        option.value = y; option.textContent = y;
        yearSelect.appendChild(option);
    });
}

function toggleFilters() { $filtersPanel.classList.toggle('active'); }

function toggleVerifiedFilter() {
    document.getElementById('verifiedToggleBtn').classList.toggle('active');
    resetAndRender();
}

let searchTimeout;
function debouncedSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => { resetAndRender(); }, 300);
}

/* =========================================
   3. CORE RENDERING ENGINE
   ========================================= */
function syncFiltersToURL() {
    const params = new URLSearchParams();
    if ($searchInput.value.trim()) params.set('q', $searchInput.value.trim());
    if ($genreFilter.value !== 'All') params.set('genre', $genreFilter.value);
    if ($yearFilter.value !== 'All') params.set('year', $yearFilter.value);
    if ($sortFilter.value !== 'metacritic') params.set('sort', $sortFilter.value);
    if ($verifiedFilter.checked) params.set('verified', '1');
    const qs = params.toString();
    const newUrl = qs ? `?${qs}` : window.location.pathname;
    if (window.location.search !== (qs ? `?${qs}` : '')) {
        window.history.replaceState(null, '', newUrl);
    }
}

function applyURLFilters() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('q')) $searchInput.value = params.get('q');
    if (params.has('genre')) $genreFilter.value = params.get('genre');
    if (params.has('year')) $yearFilter.value = params.get('year');
    if (params.has('sort')) {
        $sortFilter.value = params.get('sort');
        if (params.get('sort') === 'date_added') {
            document.getElementById('newlyAddedBtn').classList.add('active');
        }
    }
    if (params.get('verified') === '1') {
        $verifiedFilter.checked = true;
        document.getElementById('verifiedToggleBtn').classList.add('active');
    }
}

function resetAndRender() {
    const rawSearch = $searchInput.value.trim();
    const search = rawSearch.toLowerCase();
    // If the query matches an Arabic genre name, also search for its English equivalent
    const arabicGenreMatch = Object.keys(GENRE_MAPPING_AR_TO_EN).find(ar => ar.includes(rawSearch) && rawSearch.length > 1);
    const englishGenreFromArabic = arabicGenreMatch ? GENRE_MAPPING_AR_TO_EN[arabicGenreMatch] : null;
    const genre = $genreFilter.value;
    const year = $yearFilter.value;
    const sort = $sortFilter.value;
    const verifiedOnly = $verifiedFilter.checked;
    syncFiltersToURL();

    visibleGames = allGames.filter(g => {
        const matchesName = (g.name || "").toLowerCase().includes(search);
        const matchesArabicGenre = englishGenreFromArabic && g.genre && g.genre.includes(englishGenreFromArabic);
        const matchesSearch = !search || matchesName || matchesArabicGenre;
        const matchesGenre = genre === 'All' || (g.genre && g.genre.includes(genre));
        const matchesYear = year === 'All' || parseInt(g.year, 10) === parseInt(year, 10);
        const matchesVerified = !verifiedOnly || g.verified;
        return matchesSearch && matchesGenre && matchesYear && matchesVerified;
    });

    if (sort === 'newest') visibleGames.sort((a, b) => b.year - a.year);
    else if (sort === 'oldest') visibleGames.sort((a, b) => a.year - b.year);
    else if (sort === 'az') visibleGames.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'date_added') visibleGames.sort((a, b) => (b.date_added || "").localeCompare(a.date_added || ""));
    else if (sort === 'score_high') visibleGames.sort((a, b) => (b.score || 0) - (a.score || 0));
    // score_low: sink scoreless games to the bottom (Infinity sentinel) instead of floating them to the top as 0
    else if (sort === 'score_low') visibleGames.sort((a, b) => (a.score ?? Infinity) - (b.score ?? Infinity));
    else {
        const currentYear = new Date().getFullYear();
        const demotedIds = ["2179850", "1148760"];
        visibleGames.sort((a, b) => {
            if (demotedIds.includes(a.id) && !demotedIds.includes(b.id)) return 1;
            if (!demotedIds.includes(a.id) && demotedIds.includes(b.id)) return -1;
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
    _shuffledGenres = [];
    // _cardCache persists — card HTML is deterministic per game, no need to re-generate
    renderGrid();
}

function renderGrid() {
    $gameGrid.innerHTML = '';

    const isFilterActive = $searchInput.value.trim() !== "" ||
                           $genreFilter.value !== "All" ||
                           $yearFilter.value !== "All" ||
                           $verifiedFilter.checked ||
                           $sortFilter.value !== "metacritic";

    if (visibleGames.length === 0) {
        $gameGrid.classList.remove('grid-fallback');
        $gameGrid.innerHTML = `
            <div class="empty-state">
                <span class="eyebrow">NO MATCHES</span>
                <h3>لم يتم العثور على نتائج</h3>
                <p>جرب تغيير فلاتر البحث أو <button type="button" class="link-gold" onclick="openRequestModal()">اطلب اللعبة</button>.</p>
            </div>`;
        return;
    }

    if (isFilterActive) {
        $gameGrid.classList.add('grid-fallback');
        const filterHtml = `<div class="results-banner mono">${visibleGames.length} / ${allGames.filter(g => !g.isComingSoon).length} نتيجة</div>`
            + visibleGames.map(game => createGameCard(game)).join('');
        $gameGrid.innerHTML = filterHtml;
        startCountdownTimers();
    } else {
        $gameGrid.classList.remove('grid-fallback');
        let html = '';
        
        // Coming Soon
        const comingSoon = visibleGames.filter(g => g.isComingSoon);
        comingSoon.sort((a, b) => {
            const parse = s => { const p = (s||'').split('/'); return p.length === 3 ? new Date(p[2], p[1]-1, p[0]).getTime() : Infinity; };
            return parse(a.release_info) - parse(b.release_info);
        });
        if (comingSoon.length > 0) html += buildRowHTML("COMING SOON", comingSoon, 'coming-soon', true);

        // 2026 Releases
        const games2026 = visibleGames.filter(g => !g.isComingSoon && parseInt(g.year) === 2026);
        games2026.sort((a, b) => {
            const toMs = g => {
                if (g.release_date) { const [d,m,y] = g.release_date.split('/'); return new Date(y,m-1,d).getTime(); }
                return g.date_added ? new Date(g.date_added).getTime() : 0;
            };
            return toMs(b) - toMs(a);
        });
        if (games2026.length > 0) html += buildRowHTML("✦ 2026 ✦", games2026, '2026', true);

        // Fixed Genres
        FIXED_GENRES.forEach(gKey => {
            const matches = visibleGames.filter(g => !g.isComingSoon && g.genre && g.genre.includes(gKey));
            if (matches.length > 0) html += buildRowHTML(gKey.toUpperCase(), matches, gKey);
        });

        // Recently Added (last 30 days)
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const recentGames = visibleGames
            .filter(g => !g.isComingSoon && g.date_added && new Date(g.date_added) >= cutoff)
            .sort((a, b) => new Date(b.date_added) - new Date(a.date_added));
        if (recentGames.length > 0) html += buildRowHTML('آخر الإضافات', recentGames, 'recently-added', true);

        // Randomized Genres
        if (_shuffledGenres.length === 0) {
            const allGenres = new Set();
            visibleGames.forEach(g => { if (g.genre) g.genre.split(',').forEach(gen => allGenres.add(gen.trim())); });
            _shuffledGenres = Array.from(allGenres).filter(gKey => !FIXED_GENRES.includes(gKey)).sort(() => Math.random() - 0.5);
        }
        _shuffledGenres.slice(0, currentLimit).forEach(gKey => {
            const matches = visibleGames.filter(g => !g.isComingSoon && g.genre && g.genre.includes(gKey));
            if (matches.length > 0) html += buildRowHTML(gKey.toUpperCase(), matches, gKey);
        });

        $gameGrid.innerHTML = html;
        startCountdownTimers();

        requestAnimationFrame(() => {
            document.querySelectorAll('.genre-row').forEach((row, i) => { row.style.animationDelay = `${i * 80}ms`; });
        });
        $loadMoreArea.style.display = currentLimit >= _shuffledGenres.length ? 'none' : 'block';
    }
}

function loadMore() { currentLimit += BATCH_SIZE; renderGrid(); }

// HTML-escape for use inside attribute values (handles quotes, &, <, >)
function escAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildRowHTML(title, games, idPrefix, isSpecial = false) {
    const rowId = 'row-' + idPrefix.replace(/\s+/g, '-').toLowerCase();
    const cardsHtml = games.map(g => createGameCard(g)).join('');
    const count = games.length;

    // Header — clickable variant filters; isSpecial keeps row title non-filtering
    const headerInner = isSpecial
        ? `<h2 class="genre-header"><span>${escAttr(title)}</span><span class="row-count">${count}</span></h2>`
        : `<h2 class="genre-header clickable" data-genre="${escAttr(idPrefix)}"><span>${escAttr(title)}</span><span class="row-count">${count}</span></h2>`;

    // Scroll arrows: in RTL, "next" = scroll content visually left = scrollBy(-X)
    return `
        <div class="genre-row">
            <div class="row-head">
                ${headerInner}
                <div class="row-actions">
                    <button class="scroll-btn scroll-right" data-scroll-row="${escAttr(rowId)}" data-scroll-amount="800" aria-label="السابق">›</button>
                    <button class="scroll-btn scroll-left" data-scroll-row="${escAttr(rowId)}" data-scroll-amount="-800" aria-label="التالي">‹</button>
                </div>
            </div>
            <div class="row-carousel-container">
                <div class="row-carousel" id="${escAttr(rowId)}">${cardsHtml}</div>
            </div>
            <div class="row-progress"><div class="row-progress-fill"></div></div>
        </div>
    `;
}

/* =========================================
   4. HTML GENERATION (CARDS) — Najd Night
   ========================================= */
function createGameCard(game) {
    const cached = _cardCache.get(game.id);
    if (cached) return cached;

    // Image Logic — IGDB covers for 2026/CS, Steam CDN for library
    const imgUrl = game.cover
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${game.cover}.jpg`
        : (game.image || `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.id}/library_600x900.jpg`);

    const targetUrl = `https://store.steampowered.com/app/${game.id}/`;
    const safeName = escAttr(game.name || '');
    const safeGenre = escAttr(game.genre || '');
    const firstGenre = game.genre ? escAttr(game.genre.split(',')[0].trim()) : '';

    // Verified badge — green rounded square with ✓ glyph
    const verifiedBadge = game.verified ? `<div class="badge" title="Steam Deck Verified" aria-label="Steam Deck Verified"><img src="assets/badge_verified.png" alt=""></div>` : '';

    // Date tag — top-right
    let dateTag = '';
    if (game.year == 2026 && game.release_date) {
        dateTag = `<div class="date-tag">${escAttr(game.release_date)}</div>`;
    } else if (game.date_added) {
        const d = parseInt(game.date_added.slice(8, 10));
        const m = parseInt(game.date_added.slice(5, 7));
        dateTag = `<div class="date-tag new-tag">NEW ${d}/${m}</div>`;
    }

    // Locked / coming-soon overlay
    let lockedClass = '';
    let lockedOverlay = '';
    if (game.isComingSoon) {
        lockedClass = ' locked';
        const releaseDate = parseReleaseDate(game.release_info);
        const daysUntil = releaseDate ? (releaseDate.getTime() - Date.now()) / 86400000 : Infinity;
        const countdownBadge = (daysUntil >= 0 && daysUntil <= 3)
            ? `<div class="countdown-badge" data-gameid="${escAttr(game.id)}"></div>`
            : '';
        lockedOverlay = `
            <div class="locked-overlay">
                <div class="release-capsule">
                    <span>قريباً</span>
                    <span>${escAttr(game.release_info || 'TBA')}</span>
                </div>
                ${countdownBadge}
            </div>
        `;
    }

    // Score pill — bottom-left, tier-colored
    let scoreClass = 'score-low';
    if (game.score >= 80) scoreClass = 'score-great';
    else if (game.score >= 65) scoreClass = 'score-mid';
    const mcScore = game.score
        ? `<div class="metacritic-score ${scoreClass}"><span>${game.score}</span><small>/100</small></div>`
        : '';

    const html = `
        <a href="${targetUrl}" target="_blank" rel="noopener" class="game-card${lockedClass}">
            <div class="game-image-container">
                <img src="${imgUrl}" alt="${safeName}" class="game-img" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.id}/header.jpg'">
                ${lockedOverlay}
                ${verifiedBadge}
                ${dateTag}
                ${mcScore}
                <div class="rule-bottom" aria-hidden="true"></div>
            </div>
            <div class="game-info">
                <h3 class="game-title" title="${safeName}">${safeName}</h3>
                <div class="game-meta" title="${safeGenre}">${firstGenre}${game.year ? ' · ' + game.year : ''}</div>
            </div>
        </a>
    `;
    _cardCache.set(game.id, html);
    return html;
}

/* =========================================
   5. MODALS & UTILS
   ========================================= */
function openRequestModal() {
    const searchVal = $searchInput.value;
    if (searchVal) document.getElementById('gameName').value = searchVal;
    document.getElementById('requestOverlay').classList.add('active');
}

function closeRequestModal() { document.getElementById('requestOverlay').classList.remove('active'); }

async function handleRequestSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('requestSubmitBtn');
    const originalText = btn.innerText;
    const form = e.target;
    btn.innerText = "جارٍ الإرسال..."; btn.disabled = true;

    try {
        const API_URL = "https://saudideck.online/api/game-requests";
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                game: document.getElementById("gameName").value.trim(),
                order_number: document.getElementById("orderNumber").value.trim() || null
            })
        });
        if (!response.ok) throw new Error("Server error");
        alert("تم إرسال طلبك بنجاح! سيتم مراجعته قريباً.");
        closeRequestModal(); form.reset();
    } catch (error) {
        alert("حدث خطأ في الاتصال، يرجى المحاولة مرة أخرى.");
    } finally {
        btn.innerText = originalText; btn.disabled = false;
    }
}

function toggleNewlyAdded() {
    const btn = document.getElementById('newlyAddedBtn');
    if ($sortFilter.value === 'date_added') { $sortFilter.value = 'metacritic'; btn.classList.remove('active'); }
    else { $sortFilter.value = 'date_added'; btn.classList.add('active'); }
    resetAndRender();
}
