document.addEventListener('DOMContentLoaded', () => {
    // --- State & DOM Elements ---
    let currentChant = null; // To hold the loaded chant data for reuse

    const chantIncipit = document.getElementById('chant-incipit');
    const metadataContainer = document.getElementById('chant-metadata');
    const scoreContainer = document.getElementById('chant-score'); // Used for both image and Exsurge SVG
    
    const pageTitle = document.querySelector('title');

    // Action Buttons & Checkboxes
    const gregobaseLink = document.getElementById('gregobase-link');
    const neumzLink = document.getElementById('neumz-link');
    const summitLink = document.getElementById('summit-link');
    const illuminareLink = document.getElementById('illuminare-link');
    const benedictusLink = document.getElementById('benedictus-link');
    const downloadSvgBtn = document.getElementById('download-svg-btn');
    const downloadGabcBtn = document.getElementById('download-gabc-btn');
    const copyGabcBtn = document.getElementById('copy-gabc-btn');

    const benedictusIframe = document.getElementById('Benedictus');
    const preRenderSVG = document.getElementById('pre-render');
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

    function updateScoreDisplay() {
        if (!currentChant) return;

        if (renderInRealTime.checked) {
            benedictusIframe.style.display = 'block';
            preRenderSVG.style.display = 'none';
        } else {
            preRenderSVG.src = `https://gregobase.selapa.net/chant_img.php?id=${currentChant.id}`;
            preRenderSVG.style.display = 'block';
            benedictusIframe.style.display = 'none';
        }
    }


    // --- Setup and Helper Functions (Minor modifications) ---

    function populateMetadata(chant) {
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
        downloadSvgBtn.style.display = 'block'; // Always show SVG download button

        // This function updates the external links based on the current GABC score.
        const updateExternalLinks = () => {
        const processedGabc = getProcessedGabc(rawGabcScore);
        const encodedGabc = encodeURIComponent(processedGabc);
        const newBenedictusSrc = `https://benedictus.liturgiacantada.com.br/#gabc=%0A%25%25%0A${encodedGabc}`;

        // Update other links
        neumzLink.href = `https://scrib.io/#q=${encodedGabc}`;
        summitLink.href = `https://editor.sourceandsummit.com/alpha/#annotation%3A%20%0A%25%25%0A${encodedGabc}`;
        illuminareLink.href = `https://editor.sourceandsummit.com/legacy/#annotation%3A%20%0A%25%25%0A${encodedGabc}`;
        benedictusLink.href = newBenedictusSrc;

        // --- Refresh the iframe ---
        // 1. Unload the current content
        benedictusIframe.src = 'about:blank';

        // 2. Schedule the new content to load
        setTimeout(() => {
            benedictusIframe.src = newBenedictusSrc;
        }, 0); // A timeout of 0ms is enough to let the browser process the 'about:blank' change first
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
        
        // GABC Copy: Check the box state AT THE TIME OF CLICK.
        copyGabcBtn.addEventListener('click', () => {
            const processedGabc = getProcessedGabc(rawGabcScore);
            const fullGabc = generateGabcHeader(chant) + processedGabc;
            copyTextToClipboard(fullGabc, copyGabcBtn, 'Copiado!');
        });

        // SVG Download: Handles both Exsurge-rendered and Gregobase images.
        downloadSvgBtn.addEventListener('click', async () => {
            let svgSource = '';
            let filename = `${incipit.replace(/[^a-z0-9]/gi, '_')}.svg`;

            if (renderInRealTime.checked) {
                // Get SVG from Exsurge.js rendering
                const svg = scoreContainer.querySelector('svg');
                if (!svg) {
                    alert('Nenhum SVG encontrado para baixar.');
                    return;
                }
                const serializer = new XMLSerializer();
                svgSource = serializer.serializeToString(svg);
                // Add namespaces for proper rendering if missing
                if (!svgSource.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
                    svgSource = svgSource.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
                }
                if (!svgSource.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
                    svgSource = svgSource.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
                }

            } else {
                // Fetch SVG directly from Gregobase
                const gregobaseSvgUrl = `https://gregobase.selapa.net/chant_img.php?id=${chantId}`;
                try {
                    const response = await fetch(gregobaseSvgUrl);
                    if (!response.ok) throw new Error('Erro ao buscar o SVG');
                    svgSource = await response.text();
                } catch (error) {
                    alert(`Erro ao baixar o SVG: ${error.message}`);
                    console.error('Erro ao baixar o SVG:', error);
                    return;
                }
            }

            const blob = new Blob([svgSource], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }
    
    // --- Other Unchanged Helper Functions ---
    function convertToRoman(num) {
        if (isNaN(num) || num < 1 || num > 8) return num;
        const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
        return roman[num - 1];
    }

    async function copyTextToClipboard(text, buttonElement, successMessage) {
        const originalButtonText = buttonElement.textContent;
        buttonElement.textContent = successMessage;
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            buttonElement.textContent = 'Error!';
        }
        setTimeout(() => {
            buttonElement.textContent = originalButtonText;
        }, 2000);
    }

    function showError(message) {
        pageTitle.textContent = "Erro";
        chantIncipit.textContent = 'Erro';
        metadataContainer.innerHTML = '';
        scoreContainer.innerHTML = `<p class="no-results-message">${message}</p>`;
    }
    
    // --- Add listener for the main render toggle ---
    
    
    // --- Add listener for the main render toggle ---
    renderInRealTime.addEventListener('change', updateScoreDisplay);
    
    // --- Start the process ---
    displayChant();
});