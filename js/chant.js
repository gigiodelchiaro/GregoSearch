document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const chantIncipit = document.getElementById('chant-incipit');
    const metadataContainer = document.getElementById('chant-metadata');
    const scoreContainer = document.getElementById('chant-score');
    const pageTitle = document.querySelector('title');

    // Action Buttons
    const gregobaseLink = document.getElementById('gregobase-link');
    const nemzLink = document.getElementById('nemz-link');
    const downloadSvgBtn = document.getElementById('download-svg-btn'); // Changed from Link
    const downloadGabcBtn = document.getElementById('download-gabc-btn');

    // --- Helper functions ---
    const officePartMap = { 'al': 'Alleluia', 'an': 'Antiphona', 'ca': 'Canticum', 'co': 'Communio', 'gr': 'Graduale', 'hy': 'Hymnus', 'im': 'Improperia', 'in': 'Introitus', 'ky': 'Kyriale', 'of': 'Offertorium', 'or': 'Toni Communes', 'pa': 'Prosa', 'pr': 'Praefationes', 'ps': 'Psalmus', 'rb': 'Responsorium breve', 're': 'Responsorium', 'rh': 'Rhythmus', 'se': 'Sequentia', 'su': 'Supplicatio', 'tp': 'Tropa', 'tr': 'Tractus', 'va': 'Varia' };

    function generateGabcHeader(chant) {
        const header_lines = [];
        const name = (chant.incipit || '').replace(';', ':');
        if (name) header_lines.push(`name:${name};`);
        if (chant['office-part']) header_lines.push(`office-part:${chant['office-part']};`);
        if (chant.mode) header_lines.push(`mode:${chant.mode};`);
        if (chant.transcriber) header_lines.push(`transcriber:${chant.transcriber};`);
        return header_lines.join('\n') + '\n%%\n';
    }

    function extractGabcScore(chant) {
        if (!chant.gabc) return '';
        try {
            const gabcData = JSON.parse(chant.gabc);
            const gabcEntry = gabcData.find(entry => entry[0] === 'gabc');
            return gabcEntry ? gabcEntry[1].trim() : '';
        } catch (e) { return ''; }
    }

    // --- Main Function ---
    async function displayChant() {
        const urlParams = new URLSearchParams(window.location.search);
        const chantId = parseInt(urlParams.get('id'), 10);
        if (isNaN(chantId)) { showError("Invalid chant ID."); return; }

        try {
            const response = await fetch('data/chants.json');
            if (!response.ok) throw new Error("Could not load database.");
            const allChants = await response.json();
            const chant = allChants.find(c => c.id === chantId);
            if (!chant) { showError(`Chant with ID ${chantId} not found.`); return; }

            populateMetadata(chant);
            displayScoreImage(chant);
            setupActionButtons(chant);
        } catch (error) {
            showError("Error loading chant data.");
        }
    }

    function populateMetadata(chant) { /* ... (this function is unchanged) ... */
        pageTitle.textContent = chant.incipit;
        chantIncipit.textContent = chant.incipit;
        const details = {
            "Mode": chant.mode, "Office Part": officePartMap[chant['office-part']] || 'N/A',
            "Version": chant.version, "Transcriber": chant.transcriber || 'N/A',
            "Commentary": chant.commentary || 'None',
        };
        let metadataHTML = '<h2>Details</h2><dl class="metadata-list">';
        for (const [key, value] of Object.entries(details)) {
            if (value && value !== 'N/A' && value !== 'None') {
                metadataHTML += `<li><dt>${key}</dt><dd>${value}</dd></li>`;
            }
        }
        metadataHTML += '</dl>';
        metadataContainer.innerHTML = metadataHTML;
    }

    function displayScoreImage(chant) { /* ... (this function is unchanged) ... */
        scoreContainer.innerHTML = `<img src="https://gregobase.selapa.net/chant_img.php?id=${chant.id}" alt="Full score for ${chant.incipit}">`;
    }

    function setupActionButtons(chant) {
        const chantId = chant.id;
        const incipit = chant.incipit || 'chant';
        const rawGabcScore = extractGabcScore(chant);

        gregobaseLink.href = `https://gregobase.selapa.net/chant.php?id=${chantId}`;
        if (rawGabcScore) {
            nemzLink.href = `https://scrib.io/#q=${encodeURIComponent(rawGabcScore)}`;
        } else {
            nemzLink.style.display = 'none';
        }

        // --- NEW SVG DOWNLOAD LOGIC ---
        downloadSvgBtn.addEventListener('click', async () => {
            const originalText = downloadSvgBtn.textContent;
            downloadSvgBtn.textContent = 'Downloading...';
            downloadSvgBtn.disabled = true;

            try {
                const response = await fetch(`https://gregobase.selapa.net/chant_img.php?id=${chantId}`);
                if (!response.ok) throw new Error('Network response was not ok.');
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${incipit.replace(/[^a-z0-9]/gi, '_')}.svg`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Download failed:', error);
                alert('Could not download SVG. Please try right-clicking the image and "Save Image As...".');
            } finally {
                downloadSvgBtn.textContent = originalText;
                downloadSvgBtn.disabled = false;
            }
        });

        // GABC Download logic remains the same
        downloadGabcBtn.addEventListener('click', () => { /* ... (this function is unchanged) ... */
            const fullGabc = generateGabcHeader(chant) + rawGabcScore;
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
    }

    function showError(message) { /* ... (this function is unchanged) ... */
        chantIncipit.textContent = "Error";
        scoreContainer.innerHTML = `<p class="loading-message">${message}</p>`;
    }
    displayChant();
});