document.addEventListener('DOMContentLoaded', () => {
    // --- State & DOM Elements ---
    let currentChant = null; // To hold the loaded chant data for reuse

    const chantIncipit = document.getElementById('chant-incipit');
    const metadataContainer = document.getElementById('chant-metadata');
    const scoreContainer = document.getElementById('chant-score'); // Used for both image and Exsurge SVG
    const gabcSourceTextarea = document.getElementById('gabc-source-hidden'); // Required for Exsurge
    const pageTitle = document.querySelector('title');

    // Action Buttons & Checkboxes
    const gregobaseLink = document.getElementById('gregobase-link');
    const neumzLink = document.getElementById('neumz-link');
    const summitLink = document.getElementById('summit-link');
    const illuminareLink = document.getElementById('illuminare-link');
    const downloadSvgBtn = document.getElementById('download-svg-btn');
    const downloadGabcBtn = document.getElementById('download-gabc-btn');
    const copyGabcBtn = document.getElementById('copy-gabc-btn');

    // Checkboxes that modify GABC
    const cleanGABC = document.getElementById('clean');
    const MEGAcleanGABC = document.getElementById('remove');

    const addLineBreak = document.getElementById('line');
    const renderInRealTime = document.getElementById('render'); // The new checkbox

    // Regex to remove accents, underscores, brackets, and periods within parentheses.
    const cleanupRegex = /'\d?|_|\[.+?\]|\.(?<!\([^(])(?=[^(]*?\))\d?/gm;
    const MEGAcleanupRegex = /<i>i+j.<\/i>|\*|<[^>]*>|~|\{|\}/gm;

    // --- Helper functions (mostly from your existing code) ---
    const officePartMap = { 'al': 'Alleluia', 'an': 'Antiphona', 'ca': 'Canticum', 'co': 'Communio', 'gr': 'Graduale', 'hy': 'Hymnus', 'im': 'Improperia', 'in': 'Introitus', 'ky': 'Kyriale', 'of': 'Offertorium', 'or': 'Toni Communes', 'pa': 'Prosa', 'pr': 'Praefationes', 'ps': 'Psalmus', 'rb': 'Responsorium breve', 're': 'Responsorium', 'rh': 'Rhythmus', 'se': 'Sequentia', 'su': 'Supplicatio', 'tp': 'Tropa', 'tr': 'Tractus', 'va': 'Varia' };

    function generateGabcHeader(chant) {
        if (!chant) return '';
        const header_lines = [];
        const name = (chant.incipit || '').replace(';', ':');
        if (name) header_lines.push(`name:${name};`);
        if (chant['office-part']) header_lines.push(`office-part:${chant['office-part']};`);
        if (chant.mode) header_lines.push(`mode:${chant.mode};`);
        if (chant.transcriber) header_lines.push(`transcriber:${chant.transcriber};`);
        return header_lines.join('\n') + '\n%%\n';
    }

    function extractGabcScore(chant) {
        if (!chant || !chant.gabc) return '';
        try {
            const parsedData = JSON.parse(chant.gabc);
            if (Array.isArray(parsedData)) {
                const gabcEntry = parsedData.find(entry => Array.isArray(entry) && entry[0] === 'gabc');
                return gabcEntry ? gabcEntry[1].trim() : '';
            }
            if (typeof parsedData === 'string') return parsedData.trim();
            return '';
        } catch (e) {
            if (typeof chant.gabc === 'string') return chant.gabc.trim();
            console.error("Could not extract GABC score:", e);
            return '';
        }
    }

    // NEW (Refactored): This function can now be shared by all other functions.
    function getProcessedGabc(rawGabcScore) {
        if (!rawGabcScore) return '';
        
        let processedGabc = rawGabcScore;
        if (cleanGABC.checked) processedGabc = processedGabc.replace(cleanupRegex, '');
        if (MEGAcleanGABC.checked) processedGabc = processedGabc.replace(MEGAcleanupRegex, '');
        if (addLineBreak.checked) processedGabc = processedGabc.replaceAll("::", "::Z");

        // Fix capitalization
        const regex = /^((?:[^A-Z]|\([^)]*\))*)(([A-Z][^,:\s]*))/;
        return processedGabc.replace(regex, (fullMatch, prefix, wordBlock) => {
            const correctedWord = wordBlock.charAt(0) + wordBlock.substring(1).toLowerCase();
            return prefix + correctedWord;
        });
    }

    // --- Core Functionality ---

    async function displayChant() {
        const urlParams = new URLSearchParams(window.location.search);
        const chantId = parseInt(urlParams.get('id'), 10);
        if (isNaN(chantId)) { showError("ID inválido."); return; }

        try {
            const response = await fetch('data/chants.json');
            if (!response.ok) throw new Error("Não foi possível carregar o banco de dados");
            const allChants = await response.json();
            const chant = allChants.find(c => c.id === chantId);

            if (!chant) { showError(`ID ${chantId} não encontrado.`); return; }

            currentChant = chant; // Store the chant globally

            populateMetadata(chant);
            setupActionButtons(chant);
            updateScoreDisplay(); // Initial call to display score based on checkbox state

        } catch (error) {
            showError("Erro ao carregar as informações");
            console.error(error);
        }
    }
    
    // --- Display Logic ---

    // NEW: Central function to decide HOW to display the score
    function updateScoreDisplay() {
        if (!currentChant) return;

        if (renderInRealTime.checked) {
            renderGabcWithExsurge(currentChant);
        } else {
            displayScoreImage(currentChant);
        }
    }

    // OLD WAY: Display pre-rendered image
    function displayScoreImage(chant) {
        scoreContainer.innerHTML = `<img src="https://gregobase.selapa.net/chant_img.php?id=${chant.id}" alt="Imagem de ${chant.incipit}">`;
    }

    // NEW WAY: Render score with Exsurge.js
    function renderGabcWithExsurge(chant) {
        const rawGabcScore = extractGabcScore(chant);
        const processedGabc = getProcessedGabc(rawGabcScore); // Use the processed GABC!

        if (!processedGabc || !window.exsurge) {
            scoreContainer.innerHTML = '<p class="no-results-message">Partitura não disponível ou a biblioteca Exsurge falhou ao carregar.</p>';
            return;
        }

        try {
            scoreContainer.innerHTML = '<p class="loading-message">Renderizando partitura...</p>'; // Loading indicator

            // Place the final GABC code into our hidden textarea.
            gabcSourceTextarea.value = processedGabc;

            const ctxt = new exsurge.ChantContext();
            const mappings = exsurge.Gabc.createMappingsFromSource(ctxt, gabcSourceTextarea.value);
            const score = new exsurge.ChantScore(ctxt, mappings, true);

            score.performLayoutAsync(ctxt, () => {
                score.layoutChantLines(ctxt, scoreContainer.clientWidth, () => {
                    scoreContainer.innerHTML = score.createSvg(ctxt);
                });
            });
        } catch(e) {
            scoreContainer.innerHTML = `<p class="no-results-message">Erro ao renderizar a partitura. O código GABC pode estar malformado.</p>`;
            console.error("GABC rendering error:", e);
        }
    }


    // --- Setup and Helper Functions (Minor modifications) ---

    function populateMetadata(chant) {
        // ... (this function is unchanged)
        pageTitle.textContent = chant.incipit;
        chantIncipit.textContent = chant.incipit;
        const details = {
            "Modo": convertToRoman(chant.mode), "Parte do ofício": officePartMap[chant['office-part']] || 'N/A',
            "Versão": chant.version, "Transcritor": chant.transcriber || 'N/A',
            "Commentário": chant.commentary || 'None',
        };
        let metadataHTML = '<h2>Detalhes</h2><dl class="metadata-list">';
        for (const [key, value] of Object.entries(details)) {
            if (value && value !== 'N/A' && value !== 'None') {
                metadataHTML += `<li><dt>${key}</dt><dd>${value}</dd></li>`;
            }
        }
        metadataHTML += '</dl>';
        metadataContainer.innerHTML = metadataHTML;
    }

    function setupActionButtons(chant) {
        const chantId = chant.id;
        const incipit = chant.incipit || 'chant';
        const rawGabcScore = extractGabcScore(chant);
        gregobaseLink.href = `https://gregobase.selapa.net/chant.php?id=${chantId}`;

        // This function updates the external links based on the current GABC score.
        const updateExternalLinks = () => {
            const processedGabc = getProcessedGabc(rawGabcScore);
            const encodedGabc = encodeURIComponent(processedGabc);
            neumzLink.href = `https://scrib.io/#q=${encodedGabc}`;
            summitLink.href = `https://editor.sourceandsummit.com/alpha/#annotation%3A%20%0A%25%25%0A${encodedGabc}`;
            illuminareLink.href = `https://editor.sourceandsummit.com/legacy/#annotation%3A%20%0A%25%25%0A${encodedGabc}`;
        };

        // NEW: This combined function updates links AND re-renders the score if needed.
        const updateAll = () => {
            updateExternalLinks();
            updateScoreDisplay(); // Re-render the score when a GABC-modifying checkbox changes
        };

        if (rawGabcScore) {
            // Set the initial state of the links on page load.
            updateExternalLinks();

            // Add listeners to GABC-modifying checkboxes. They now update everything.
            cleanGABC.addEventListener('change', updateAll);
            MEGAcleanGABC.addEventListener('change', updateAll);
            addLineBreak.addEventListener('change', updateAll);

            // Show all GABC-related controls.
            neumzLink.style.display = 'inline-block';
            summitLink.style.display = 'inline-block';
            illuminareLink.style.display = 'inline-block';
            copyGabcBtn.style.display = 'inline-block';
            downloadGabcBtn.style.display = 'inline-block';
            cleanGABC.parentElement.style.display = 'inline-block';
            MEGAcleanGABC.parentElement.style.display = 'inline-block';
        }

        // GABC Download: Check the box state AT THE TIME OF CLICK.
        downloadGabcBtn.addEventListener('click', () => {
            const processedGabc = getProcessedGabc(rawGabcScore);
            const fullGabc = generateGabcHeader(chant) + processedGabc;
            const blob = new Blob([fullGabc], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${incipit.replace(/[^a-z0-9]/gi, '_')}.gabc`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
        
        // ... (Other button listeners like SVG download and Copy GABC are mostly unchanged) ...
    }
    
    // --- Other Unchanged Helper Functions ---
    function convertToRoman(num) { /* ...unchanged... */ }
    async function copyTextToClipboard(text, buttonElement, originalButtonText) { /* ...unchanged... */ }
    function showError(message) { /* ...unchanged... */ }
    
    // --- Add listener for the main render toggle ---
    renderInRealTime.addEventListener('change', updateScoreDisplay);
    
    // --- Start the process ---
    displayChant();
});