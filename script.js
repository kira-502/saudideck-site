// ==========================================
// 3. SYSTEM LOGIC (Batch Rendering + Load More + Sorting)
// ==========================================

// Merge Arrays (All games in one place)
const allGames = [...comingSoonGames, ...games];

// Flag unreleased games
allGames.forEach(g => {
    if (comingSoonGames.includes(g)) g.isUnreleased = true;
});

const BATCH_SIZE = 24;
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

    // NEW ARRIVAL BADGE LOGIC
    let newBadgeHTML = "";
    if (game.date_added) {
        const addedDate = new Date(game.date_added);
        const today = new Date();
        const diffTime = Math.abs(today - addedDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
            newBadgeHTML = `<div class="new-badge">NEW</div>`;
        }
    }

    // GENRE TAGS LOGIC (Limit to 3)
    const genreBadges = game.genre
        ? game.genre.split(',').slice(0, 3).map(g => `<span class="genre-tag">${g.trim()}</span>`).join('')
        : '';

    return `
<a href="https://store.steampowered.com/app/${game.id}/" target="_blank" rel="noopener noreferrer" class="${cardClass}">
<div class="card-image">
    ${newBadgeHTML}
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

    filteredGames = allGames.filter(game => {
        const matchesGenre = genreSelect === "All" || (game.genre && game.genre.split(',').map(g => g.trim()).includes(genreSelect));
        const matchesSearch = game.name.toLowerCase().includes(searchTerm);
        const matchesVerified = !verifiedOnly || game.verified;
        return matchesGenre && matchesSearch && matchesVerified;
    });

    if (sortSelect === "metacritic") {
        filteredGames.sort((a, b) => {
            if (a.isUnreleased && !b.isUnreleased) return -1;
            if (!a.isUnreleased && b.isUnreleased) return 1;
            if (a.isUnreleased && b.isUnreleased) {
                const dateA = a.release_date || `${a.year}-12-31`;
                const dateB = b.release_date || `${b.year}-12-31`;
                return dateA.localeCompare(dateB);
            }
            return (b.score || 0) - (a.score || 0);
        });
    } else if (sortSelect === "date_added") {
        filteredGames.sort((a, b) => {
            // Priority 1: Unreleased Group First
            if (a.isUnreleased && !b.isUnreleased) return -1;
            if (!a.isUnreleased && b.isUnreleased) return 1;

            // Priority 2: Newest Added First (Within their group)
            const dateA = a.date_added || "1970-01-01";
            const dateB = b.date_added || "1970-01-01";
            return dateB.localeCompare(dateA);
        });
    } else if (sortSelect === "newest") {
        filteredGames.sort((a, b) => {
            // Handle "TBA" or string years
            const yearA = parseInt(a.year) || 0;
            const yearB = parseInt(b.year) || 0;
            return yearB - yearA;
        });
    } else if (sortSelect === "oldest") {
        filteredGames.sort((a, b) => {
            const yearA = parseInt(a.year) || 9999;
            const yearB = parseInt(b.year) || 9999;
            return yearA - yearB;
        });
    } else if (sortSelect === "az") {
        filteredGames.sort((a, b) => a.name.localeCompare(b.name));
    }

    // 3. Reset
    document.getElementById("gameGrid").innerHTML = "";
    displayedCount = 0;

    if (filteredGames.length === 0 && searchTerm) {
        document.getElementById("gameGrid").innerHTML = `
            <div class="empty-state">
                <h2 style="color:#fff; margin-bottom:10px;">لم يتم العثور على نتائج</h2>
                <p style="color:#666; margin-bottom:20px;">لم نتمكن من العثور على "${searchTerm}" في مكتبتنا.</p>
                <a href="javascript:void(0)" onclick="openRequestModal()" class="btn-request-main" style="text-decoration:none; display:inline-block;">اطلب هذه اللعبة</a>
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

    // Observe new layout
    observeCards(grid);

    displayedCount += BATCH_SIZE;

    if (displayedCount >= filteredGames.length) {
        btnArea.style.display = "none";
    } else {
        btnArea.style.display = "block";
    }
}

/* --- REQUEST MODAL LOGIC --- */
function openRequestModal() {
    const overlay = document.getElementById("requestOverlay");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden"; // Prevent background scroll
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

    btn.disabled = true;
    btn.textContent = "جاري الإرسال...";

    try {
        const response = await fetch("https://formspree.io/f/xdanyanp", {
            method: "POST",
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            alert("تم إرسال طلبك بنجاح!");
            closeRequestModal();
        } else {
            alert("حدث خطأ، حاول مرة أخرى");
        }
    } catch (error) {
        alert("حدث خطأ، حاول مرة أخرى");
    } finally {
        btn.disabled = false;
        btn.textContent = "إرسال الطلب";
    }
}

// Initialize and setup
function init() {
    populateGenreFilter();
    resetAndRender();
    window.addEventListener('scroll', handleInfiniteScroll);
}


/* --- 4. SHOWCASE ENHANCEMENTS --- */

function observeCards(container) {
    const cards = container.querySelectorAll('.game-card');
    cards.forEach(card => observer.observe(card));
}

function handleInfiniteScroll() {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (scrollTop + clientHeight >= scrollHeight - 600) {
        loadMore();
    }
}
