/* =========================================
   1. GLOBAL VARIABLES & INIT
   ========================================= */
let allGames = [];
let visibleGames = [];
const BATCH_SIZE = 20;
let currentLimit = BATCH_SIZE;

// Store interval IDs to prevent memory leaks
let activeIntervals = [];

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

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    // Combine coming soon + main library (games is global from games.js)
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
        if (g.genre) {
            g.genre.split(',').forEach(gen => genres.add(gen.trim()));
        }
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
    const panel = document.getElementById('filtersPanel');
    panel.classList.toggle('active');
}

function toggleVerifiedFilter() {
    const btn = document.getElementById('verifiedToggleBtn');
    btn.classList.toggle('active');
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

    if (sort === 'newest') {
        visibleGames.sort((a, b) => b.year - a.year);
    } else if (sort === 'oldest') {
        visibleGames.sort((a, b) => a.year - b.year);
    } else if (sort === 'az') {
        visibleGames.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'date_added') {
        visibleGames.sort((a, b) => {
            if (a.date_added && b.date_added) return b.date_added.localeCompare(a.date_added);
            if (a.date_added) return -1;
            if (b.date_added) return 1;
            return 0;
        });
    } else {
        // --- CUSTOM SMART SORT ---
        // Priority 1: Coming Soon (Top)
        // Priority 2: Recent Hits (Last 5 Years + 80+ Score)
        // Priority 3: Standard Library (By Score)
        // Priority 4: "Demoted" Games (Manually moved to bottom)

        const currentYear = new Date().getFullYear();
        // IDs for: Cobalt Core, I Was a Teenage Exocolonist
        const demotedIds = ["2179850", "1148760"];

        visibleGames.sort((a, b) => {
            const aDemoted = demotedIds.includes(a.id);
            const bDemoted = demotedIds.includes(b.id);

            // Rule 1: Demoted games always go last
            if (aDemoted && !bDemoted) return 1;
            if (!aDemoted && bDemoted) return -1;

            // Rule 2: Coming Soon always first
            if (a.isComingSoon && !b.isComingSoon) return -1;
            if (!a.isComingSoon && b.isComingSoon) return 1;

            // Rule 3: Recent Hits (High Score + New)
            // Use parseInt to ensure year is a number
            const aIsRecentHit = (parseInt(a.year) >= currentYear - 5) && ((a.score || 0) >= 80);
            const bIsRecentHit = (parseInt(b.year) >= currentYear - 5) && ((b.score || 0) >= 80);

            if (aIsRecentHit && !bIsRecentHit) return -1;
            if (!aIsRecentHit && bIsRecentHit) return 1;

            // Rule 4: Everything else by Score
            return (b.score || 0) - (a.score || 0);
        });
    }

    currentLimit = BATCH_SIZE;
    renderGrid();
}

function renderGrid() {
    const grid = document.getElementById('gameGrid');
    grid.innerHTML = '';
    clearCountdowns();

    const toShow = visibleGames.slice(0, currentLimit);

    if (toShow.length === 0) {
        grid.innerHTML = `
               <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #888;">
                   <h3>لم يتم العثور على نتائج 😔</h3>
                   <p>جرب تغيير فلاتر البحث أو <a href="#" onclick="openRequestModal()" style="color:var(--accent)">اطلب اللعبة</a></p>
               </div>
           `;
        document.getElementById('loadMoreArea').style.display = 'none';
        return;
    }

    toShow.forEach(game => {
        const isNearest = game.isComingSoon && game.id === comingSoonGames[0].id;
        grid.innerHTML += createGameCard(game, isNearest);
    });

    // Start countdowns logic removed

    document.getElementById('loadMoreArea').style.display =
        currentLimit >= visibleGames.length ? 'none' : 'block';
}

function loadMore() {
    currentLimit += BATCH_SIZE;
    renderGrid();
}



/* =========================================
   5. HTML GENERATION (CARDS)
   ========================================= */
function createGameCard(game) {
    // 1. Image & Link Logic
    const imgUrl = game.image || `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.id}/library_600x900.jpg`;

    let slug = game.slug;
    if (!slug) {
        slug = game.name.toLowerCase().replace(/:/g, '').replace(/'/g, '').replace(/#/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    const targetUrl = `https://www.igdb.com/games/${slug}`;

    // 2. Badges
    let badgesHtml = game.verified ? `<div class="badge"><img src="assets/badge_verified.png"></div>` : '';
    let dateTag = game.date_added ? `<div class="date-tag">NEW ${game.date_added.slice(5)}</div>` : '';

    // 3. Static "Coming Soon" Overlay (No Timer)
    let lockedClass = "";
    let lockedOverlay = "";

    if (game.isComingSoon) {
        lockedClass = "locked";
        // Simple, clean date display
        lockedOverlay = `
            <div class="locked-overlay">
                <div class="release-capsule">
                    <span style="color:var(--accent); font-weight:800;">COMING SOON</span>
                    <span>${game.release_info}</span>
                </div>
            </div>`;
    }

    // 4. HTML
    return `
        <a href="${targetUrl}" target="_blank" class="game-card ${lockedClass}">
            <div class="game-image-container">
                <img src="${imgUrl}" alt="${game.name}" class="game-img" loading="lazy">
                ${lockedOverlay}
                <div class="overlay">${badgesHtml}</div>
                ${dateTag}
            </div>
            <div class="game-info">
                <h3 class="game-title">${game.name}</h3>
                <div class="game-meta">
                    <span class="metacritic-score">MC: ${game.score || 'N/A'}</span>
                    <span>${game.year}</span>
                </div>
                <div class="game-genre">${game.genre || ''}</div>
            </div>
        </a>
    `;
}

/* =========================================
   6. COUNTDOWN LOGIC (PRECISION HUD)
   ========================================= */
function startCountdown(targetDateString, elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const parts = targetDateString.split('/');
    const targetDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`).getTime();

    function update() {
        const now = new Date().getTime();
        const distance = targetDate - now;

        if (distance < 0) {
            element.innerHTML = "<h2 style='color:var(--accent)'>AVAILABLE NOW</h2>";
            element.classList.remove('nearest-active');
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

        element.innerHTML = `
               <div class="hype-label">NEXT DROP IMMINENT</div>
               <div class="countdown-timer">
                   <div class="count-unit">
                       <span class="count-val">${days}</span>
                       <span class="count-label">DAYS</span>
                   </div>
                   <div class="count-unit">
                       <span class="count-val">${hours}</span>
                       <span class="count-label">HRS</span>
                   </div>
                   <div class="count-unit">
                       <span class="count-val">${minutes}</span>
                       <span class="count-label">MIN</span>
                   </div>
               </div>
               <div class="release-date-sub">Target: ${targetDateString}</div>
           `;
    }

    update();
    const interval = setInterval(update, 1000);
    activeIntervals.push(interval);
}

/* =========================================
   7. MODALS & INTERACTIONS
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

function pickRandomGame() {
    if (visibleGames.length === 0) return;
    document.getElementById('randomOverlay').classList.add('active');

    const imgEl = document.getElementById('rouletteImg');
    const titleEl = document.getElementById('rouletteTitle');
    const btnEl = document.getElementById('rouletteSteamBtn');

    let steps = 0;
    const maxSteps = 20;
    const interval = setInterval(() => {
        const randomGame = visibleGames[Math.floor(Math.random() * visibleGames.length)];
        // CHANGED: Prioritize custom image
        const img = randomGame.image || `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${randomGame.id}/header.jpg`;
        imgEl.src = img;
        titleEl.innerText = randomGame.name;

        steps++;
        if (steps >= maxSteps) {
            clearInterval(interval);
            if (btnEl) {
                // CHANGED: Use manual slug if available
                let slug = randomGame.slug;
                if (!slug) {
                    slug = randomGame.name.toLowerCase()
                        .replace(/:/g, '')
                        .replace(/'/g, '')
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, '');
                }

                btnEl.href = `https://www.igdb.com/games/${slug}`;
                btnEl.innerText = "عرض في IGDB";
            }
            titleEl.innerText = "✨ " + randomGame.name + " ✨";
            titleEl.style.color = "var(--accent)";
        }
    }, 100);
}

function closeRandomModal() {
    document.getElementById('randomOverlay').classList.remove('active');
}
