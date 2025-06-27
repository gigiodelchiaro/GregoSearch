document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const searchInput = document.getElementById('search-input');
    const officePartFilter = document.getElementById('office-part-filter');
    const modeFilter = document.getElementById('mode-filter');
    const resultsContainer = document.getElementById('results-container');
    const resultsCount = document.getElementById('results-count');
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const pageInfo = document.getElementById('page-info');

    // --- State & Mappings ---
    let allChants = [];
    let currentFilteredChants = [];
    let currentPage = 1;
    const itemsPerPage = 100;

    // Maps the office-part code to its full name
    const officePartMap = {
        'al': 'Alleluia', 'an': 'Antiphona', 'ca': 'Canticum', 'co': 'Communio',
        'gr': 'Graduale', 'hy': 'Hymnus', 'im': 'Improperia', 'in': 'Introitus',
        'ky': 'Kyriale', 'of': 'Offertorium', 'or': 'Toni Communes', 'pa': 'Prosa',
        'pr': 'Praefationes', 'ps': 'Psalmus', 'rb': 'Responsorium breve',
        're': 'Responsorium', 'rh': 'Rhythmus', 'se': 'Sequentia', 'su': 'Supplicatio',
        'tp': 'Tropa', 'tr': 'Tractus', 'va': 'Varia'
    };

    // --- NEW: Maps the office-part code to its color ---
    const officePartColorMap = {
        'al': '#b0d2e8', 'an': '#e0c85c', 'ca': '#707070', 'co': '#909050',
        'gr': '#b0e070', 'hy': '#c0a080', 'im': '#8c5c44', 'in': '#d04040',
        'ky': '#4040a0', 'of': '#809070', 'or': '#e0e0a0', 'pa': '#a050a0',
        'pr': '#d080a0', 'ps': '#8090a0', 'rb': '#9c7c60', 're': '#9c7c60',
        'rh': '#e09050', 'se': '#a09070', 'su': '#d04040', 'tp': '#80d0d0',
        'tr': '#c09060', 'va': '#d0d0d0'
    };
    const defaultColor = '#cccccc'; // Fallback color

    // --- Utility: Debounce ---
    function debounce(func, delay = 300) { /* ... (this function is unchanged) ... */
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // --- Data Loading ---
    async function loadChants() { /* ... (this function is unchanged) ... */
        try {
            const response = await fetch('data/chants.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            allChants = await response.json();
            filterAndSearch();
        } catch (error) {
            resultsContainer.innerHTML = '<p class="loading-message">Error loading chant database.</p>';
        }
    }

    // --- Core Logic: Filtering & Searching ---
    function filterAndSearch() { /* ... (this function is unchanged) ... */
        const searchTerm = searchInput.value.toLowerCase();
        const officePart = officePartFilter.value;
        const mode = modeFilter.value;
        currentFilteredChants = allChants.filter(chant =>
            chant.incipit.toLowerCase().includes(searchTerm) &&
            (!officePart || chant['office-part'] === officePart) &&
            (!mode || chant.mode === mode)
        );
        currentPage = 1;
        renderPage();
    }

    // --- UPDATED: Rendering Logic with more details ---
    function renderPage() {
        resultsContainer.innerHTML = '';
        const totalPages = Math.ceil(currentFilteredChants.length / itemsPerPage);
        resultsCount.textContent = `${currentFilteredChants.length} chants found.`;
        pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage >= totalPages;

        if (currentFilteredChants.length === 0) {
            resultsContainer.innerHTML = '<p class="loading-message">No results found.</p>';
            return;
        }

        const startIndex = (currentPage - 1) * itemsPerPage;
        const chantsForPage = currentFilteredChants.slice(startIndex, startIndex + itemsPerPage);

        const fragment = document.createDocumentFragment();
        for (const chant of chantsForPage) {
            const card = document.createElement('a');
            card.className = 'result-card';
            card.href = `chant.html?id=${chant.id}`;

            const officePartCode = chant['office-part'];
            const officePartName = officePartMap[officePartCode] || officePartCode || 'N/A';
            const officePartColor = officePartColorMap[officePartCode] || defaultColor;
            
            // --- UPDATED INNERHTML TEMPLATE to match new CSS ---
            card.innerHTML = `
                <div class="card-title">
                    <h3 class="card-incipit" title="${chant.incipit}">${chant.incipit}</h3>
                </div>
                <div class="card-image-wrapper">
                    <img src="https://gregobase.selapa.net/chant_img.php?id=${chant.id}" alt="Score preview for ${chant.incipit}" loading="lazy">
                </div>
                <div class="card-info">
                    <div class="card-details">
                        <span>
                            <span class="color-chip" style="background-color: ${officePartColor};"></span>
                            ${officePartName}
                        </span>
                        <span><strong>Mode:</strong> ${chant.mode || 'N/A'}</span>
                        <span><strong>Version:</strong> ${chant.version || 'N/A'}</span>
                    </div>
                </div>
            `;
            fragment.appendChild(card);
        }
        resultsContainer.appendChild(fragment);
    }

    // --- Event Listeners ---
    searchInput.addEventListener('input', debounce(filterAndSearch));
    officePartFilter.addEventListener('change', filterAndSearch);
    modeFilter.addEventListener('change', filterAndSearch);
    prevPageBtn.addEventListener('click', () => { /* ... (this function is unchanged) ... */
        if (currentPage > 1) { currentPage--; renderPage(); window.scrollTo(0, 0); }
    });
    nextPageBtn.addEventListener('click', () => { /* ... (this function is unchanged) ... */
        if (currentPage < Math.ceil(currentFilteredChants.length / itemsPerPage)) { currentPage++; renderPage(); window.scrollTo(0, 0); }
    });

    // --- Initialization ---
    loadChants();
});