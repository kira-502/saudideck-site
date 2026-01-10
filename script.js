// ==========================================
// 3. SYSTEM LOGIC (Batch Rendering + Load More + Sorting)
// ==========================================

// Merge Arrays (All games in one place)
const allGames = [...comingSoonGames, ...games];

// Flag unreleased games
allGames.forEach(g => {
    if (comingSoonGames.includes(g)) g.isUnreleased = true;
});

const BATCH_SIZE = 18;
let displayedCount = 0;
let filteredGames = [];
// Dynamically populate Genre Filter dropdown
function populateGenreFilter() {
    const genreSelect = document.getElementById("genreFilter");
    if (!genreSelect) return;

    // Extract unique genres
    const genres = new Set();
    allGames.forEach(game => {
        if (game.genre) {
            game.genre.split(',').forEach(g => genres.add(g.trim()));
        }
    });

    // Sort alphabetically
    const sortedGenres = Array.from(genres).sort();

    // Keep "كل التصنيفات", remove the rest
    genreSelect.innerHTML = `<option value="All">كل التصنيفات</option>`;

    // Add unique genres
    sortedGenres.forEach(genre => {
        const option = document.createElement("option");
        option.value = genre;
        option.textContent = genre;
        genreSelect.appendChild(option);
    });
}

function populateYearFilter() {
    const yearSelect = document.getElementById("yearFilter");
    if (!yearSelect) return;

    // Extract unique years and sort descending (Newest first)
    const years = new Set();
    allGames.forEach(game => {
        if (game.year) years.add(game.year);
    });

    const sortedYears = Array.from(years).sort((a, b) => b - a);

    yearSelect.innerHTML = `<option value="All">كل السنوات</option>`;

    sortedYears.forEach(y => {
        const option = document.createElement("option");
        option.value = y;
        option.textContent = y;
        yearSelect.appendChild(option);
    });
}

const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('reveal');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// INITIAL LOAD
document.addEventListener("DOMContentLoaded", () => {
    init();
});

// --- HELPER FUNCTIONS ---
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
const debouncedSearch = debounce(() => resetAndRender(), 300);

function toggleVerifiedFilter() {
    const btn = document.getElementById("verifiedToggleBtn");
    const checkbox = document.getElementById("verifiedFilter");

    if (checkbox.checked) {
        btn.classList.add("active");
    } else {
        btn.classList.remove("active");
    }
    resetAndRender();
}

function createGameCard(game) {
    const isLocked = game.isUnreleased;
    const imgUrl = game.image || `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.id}/library_600x900.jpg`;

    const fallback = game.image
        ? "this.style.display='none'; this.nextElementSibling.style.display='flex'"
        : `this.onerror=null; this.src='https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.id}/header.jpg';`;

    let cardClass = "game-card";
    let lockedOverlay = "";
    let verifiedHTML = game.verified ? `
        <div class="verified-badge" title="Steam Deck Verified">
            <img src="assets/badge_verified.png" alt="Verified">
        </div>` : '';

    if (isLocked) {
        cardClass += " locked";
        let releaseText = "TBA";
        let icon = "🕒";

        if (game.release_info) {
            releaseText = game.release_info;
            icon = (game.release_type === 'date') ? "📅" : "🕒";
        } else if (game.release_date) {
            const [y, m, d] = game.release_date.split('-');
            releaseText = `${d}/${m}/${y}`;
            icon = "🕒";
        } else if (game.year) {
            releaseText = `COMING ${game.year}`;
        }

        lockedOverlay = `
            <div class="locked-overlay">
                <div class="lock-icon">🔒</div>
                <div class="release-capsule">
                    <span class="capsule-icon">${icon}</span>
                    <span>${releaseText}</span>
                </div>
            </div>
        `;
    }

    // GENRE TAGS LOGIC (Limit to 2)
    const genreBadges = game.genre
        ? game.genre.split(',').slice(0, 2).map(g => `<span class="genre-tag">${g.trim()}</span>`).join('')
        : '';

    return `
<a href="https://store.steampowered.com/app/${game.id}/" target="_blank" rel="noopener noreferrer" class="${cardClass}">
<div class="card-image">
    ${verifiedHTML}
    ${lockedOverlay}
    <img src="${imgUrl}" alt="${game.name}" loading="lazy" class="cover-art" onerror="${fallback}">
</div>
<div class="card-info">
    <h3 class="game-title" title="${game.name}">${game.name}</h3>
    <div class="game-meta">
        <div class="card-genres">
            ${genreBadges}
        </div>
        <span>${game.year}</span>
    </div>
</div>
</a>
`;
}

function resetAndRender() {
    const genreSelect = document.getElementById("genreFilter").value;
    const sortSelect = document.getElementById("sortFilter").value;
    const searchTerm = document.getElementById("searchInput").value.toLowerCase();
    const verifiedOnly = document.getElementById("verifiedFilter").checked;

    // Safety Check: If year filter is missing, default to "All"
    const yearEl = document.getElementById("yearFilter");
    const yearSelect = yearEl ? yearEl.value : "All";

    filteredGames = allGames.filter(game => {
        const matchesGenre = genreSelect === "All" || (game.genre && game.genre.split(',').map(g => g.trim()).includes(genreSelect));
        const matchesSearch = game.name.toLowerCase().includes(searchTerm);
        const matchesVerified = !verifiedOnly || game.verified;
        const matchesYear = yearSelect === "All" || game.year == yearSelect;

        return matchesGenre && matchesSearch && matchesVerified && matchesYear;
    });

    // Sorting Logic
    if (sortSelect === "metacritic") {
        filteredGames.sort((a, b) => {
            if (a.isUnreleased && !b.isUnreleased) return -1;
            if (!a.isUnreleased && b.isUnreleased) return 1;
            if (a.isUnreleased && b.isUnreleased) return 0;
            return (b.score || 0) - (a.score || 0);
        });
    } else if (sortSelect === "date_added") {
        filteredGames.sort((a, b) => {
            const dateA = a.date_added || "1970-01-01";
            const dateB = b.date_added || "1970-01-01";
            return dateB.localeCompare(dateA);
        });
    } else if (sortSelect === "newest") {
        filteredGames.sort((a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0));
    } else if (sortSelect === "oldest") {
        filteredGames.sort((a, b) => (parseInt(a.year) || 9999) - (parseInt(b.year) || 9999));
    } else if (sortSelect === "az") {
        filteredGames.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Render
    document.getElementById("gameGrid").innerHTML = "";
    displayedCount = 0;

    if (filteredGames.length === 0 && searchTerm) {
        // ESCAPE SINGLE QUOTES to prevent errors
        const safeTerm = searchTerm.replace(/'/g, "\\'");

        document.getElementById("gameGrid").innerHTML = `
        <div class="empty-state" style="border: 2px dashed #333; padding: 40px; border-radius: 12px; background: rgba(255,255,255,0.02);">
            <div style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;">🔍</div>
            <h2 style="color:#fff; margin-bottom:10px; font-size: 1.2rem;">لم نجد "${safeTerm}"</h2>
            <p style="color:#888; margin-bottom: 25px; font-size: 0.9rem;">هل تبحث عن لعبة غير موجودة؟</p>
            
            <button onclick="openRequestModal('${safeTerm}')" class="btn-request-main" style="padding: 10px 25px; font-size: 0.9rem;">
                + طلب توفير اللعبة
            </button>
        </div>
    `;
        document.getElementById("loadMoreArea").style.display = "none";
    } else {
        loadMore();
    }
}

/* --- RANDOM PICKER LOGIC (ROULETTE) --- */
let rouletteInterval = null;

function pickRandomGame() {
    if (filteredGames.length === 0) return;

    const overlay = document.getElementById("randomOverlay");
    const img = document.getElementById("rouletteImg");
    const title = document.getElementById("rouletteTitle");
    const steamBtn = document.getElementById("rouletteSteamBtn");

    // Reset UI
    overlay.classList.add("active");
    title.textContent = "جارٍ الاختيار...";
    steamBtn.style.display = "none";
    img.style.filter = "blur(5px)";

    let shuffleCount = 0;
    const maxShuffle = 20; // 2 seconds (100ms * 20)

    if (rouletteInterval) clearInterval(rouletteInterval);

    rouletteInterval = setInterval(() => {
        const randomIdx = Math.floor(Math.random() * filteredGames.length);
        const game = filteredGames[randomIdx];
        const imgUrl = game.image || `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.id}/library_600x900.jpg`;

        img.src = imgUrl;
        shuffleCount++;

        if (shuffleCount >= maxShuffle) {
            clearInterval(rouletteInterval);
            revealWinner(game);
        }
    }, 100);
}

function revealWinner(game) {
    const img = document.getElementById("rouletteImg");
    const title = document.getElementById("rouletteTitle");
    const steamBtn = document.getElementById("rouletteSteamBtn");

    img.style.filter = "none";
    img.style.transform = "scale(1.05)";
    setTimeout(() => img.style.transform = "scale(1)", 200);

    title.textContent = game.name;
    steamBtn.href = `https://store.steampowered.com/app/${game.id}/`;
    steamBtn.style.display = "inline-block";
}

function closeRandomModal() {
    if (rouletteInterval) clearInterval(rouletteInterval);
    document.getElementById("randomOverlay").classList.remove("active");
}


function loadMore() {
    const grid = document.getElementById("gameGrid");
    const btnArea = document.getElementById("loadMoreArea");
    const nextBatch = filteredGames.slice(displayedCount, displayedCount + BATCH_SIZE);
    if (nextBatch.length === 0) {
        btnArea.style.display = "none";
        return;
    }
    const htmlString = nextBatch.map(game => createGameCard(game, false)).join('');
    grid.insertAdjacentHTML('beforeend', htmlString);
    // TURBO FIX: Only observe the newly added children, not the whole grid
    const totalChildren = grid.children.length;
    for (let i = totalChildren - nextBatch.length; i < totalChildren; i++) {
        observer.observe(grid.children[i]);
    }
    displayedCount += BATCH_SIZE;
    if (displayedCount >= filteredGames.length) {
        btnArea.style.display = "none";
    } else {
        btnArea.style.display = "block";
    }
}

/* --- REQUEST MODAL LOGIC --- */
function openRequestModal(prefillName = null) {
    const overlay = document.getElementById("requestOverlay");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";

    // AUTO-FILL LOGIC
    // If the user clicked the button from search, fill the input automatically
    if (prefillName && typeof prefillName === 'string') {
        const input = document.getElementById("gameName");
        if (input) {
            input.value = prefillName;
            // Optional: Add a visual flash to show it was filled
            input.style.borderColor = "var(--accent)";
            setTimeout(() => input.style.borderColor = "#333", 1000);
        }
    }
}

function closeRequestModal() {
    const overlay = document.getElementById("requestOverlay");
    overlay.classList.remove("active");
    document.body.style.overflow = "auto";
    document.getElementById("requestForm").reset();
}

async function handleRequestSubmit(event) {
    event.preventDefault();
    const btn = document.getElementById("requestSubmitBtn");
    const form = event.target;
    const formData = new FormData(form);
    // The User's Google Script URL
    const scriptURL = 'https://script.google.com/macros/s/AKfycbwfdbLb4OBTf_YDoFm70ZtnXsu6351ADQlAiCP8iQ0z_XTchp-3myOnoPo9aDkjwlnx/exec';

    btn.disabled = true;
    btn.textContent = "جاري الإرسال...";

    try {
        const response = await fetch(scriptURL, {
            method: 'POST',
            body: formData
        });
        alert("تم إرسال طلبك بنجاح! سيتم مراجعته قريباً.");
        closeRequestModal();
    } catch (error) {
        console.error('Error!', error.message);
        alert("حدث خطأ، حاول مرة أخرى");
    } finally {
        btn.disabled = false;
        btn.textContent = "إرسال الطلب";
    }
}

// Initialize and setup
function init() {
    populateGenreFilter();
    populateYearFilter();
    resetAndRender();
}



// --- OPTIMIZED SCROLL HANDLER ---
let lastScrollTop = 0;
let ticking = false;
const mainHeader = document.querySelector("header");

window.addEventListener("scroll", () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            // Smart Header Logic Only (No Infinite Scroll)
            if (window.innerWidth > 768) {
                if (scrollTop > 0) {
                    if (scrollTop > lastScrollTop && scrollTop > 100) {
                        mainHeader.classList.add("header-hidden");
                    } else {
                        mainHeader.classList.remove("header-hidden");
                    }
                } else {
                    mainHeader.classList.remove("header-hidden");
                }
            } else {
                mainHeader.classList.remove("header-hidden"); // Always show on mobile (absolute)
            }
            lastScrollTop = scrollTop;
            ticking = false;
        });
        ticking = true;
    }
});

// --- MOBILE MENU TOGGLE (Must be global) ---
function toggleFilters() {
    const panel = document.getElementById("filtersPanel");
    const btn = document.querySelector(".mobile-filter-btn");

    if (panel && btn) {
        panel.classList.toggle("active");
        btn.classList.toggle("active");
        // Text update removed -> CSS handles the icon rotation now
    }
}
