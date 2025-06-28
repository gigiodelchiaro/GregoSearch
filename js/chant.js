document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const chantIncipit = document.getElementById('chant-incipit');
    const metadataContainer = document.getElementById('chant-metadata');
    const scoreContainer = document.getElementById('chant-score');
    const pageTitle = document.querySelector('title');

    // Action Buttons
    const gregobaseLink = document.getElementById('gregobase-link');
    const neumzLink = document.getElementById('neumz-link');
    const summitLink = document.getElementById('summit-link');
    const illuminareLink = document.getElementById('illuminare-link');
    const downloadSvgBtn = document.getElementById('download-svg-btn');
    const downloadGabcBtn = document.getElementById('download-gabc-btn');
    const cleanGABC = document.getElementById('clean'); // checkbox
    const copyGabcBtn = document.getElementById('copy-gabc-btn');

    // Regex to remove accents, underscores, brackets, and periods within parentheses.
    const cleanupRegex = /'\d?|_|\[.+?\]|\.(?<!\([^(])(?=[^(]*?\))\d?/gm;

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

    async function copyTextToClipboard(text, buttonElement, originalButtonText) {
        if (!text) {
            alert('No content available to copy.');
            return;
        }
        buttonElement.textContent = 'Copying...';
        buttonElement.disabled = true;
        try {
            await navigator.clipboard.writeText(text);
            buttonElement.textContent = 'Copied!';
            setTimeout(() => {
                buttonElement.textContent = originalButtonText;
                buttonElement.disabled = false;
            }, 1500);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            buttonElement.textContent = 'Failed to copy!';
            alert('Failed to copy to clipboard. This often happens if the page is not served over HTTPS or if clipboard access was denied by the browser.');
            setTimeout(() => {
                buttonElement.textContent = originalButtonText;
                buttonElement.disabled = false;
            }, 3000);
        }
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
    function convertToRoman(num) {
        switch (num) {
            case '1': return 'I'; case '2': return 'II'; case '3': return 'III'; case '4': return 'IV';
            case '5': return 'V'; case '6': return 'VI'; case '7': return 'VII'; case '8': return 'VIII';
            default: return 'N/A';
        }
    }
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

    function displayScoreImage(chant) {
        scoreContainer.innerHTML = `<img src="https://gregobase.selapa.net/chant_img.php?id=${chant.id}" alt="Full score for ${chant.incipit}">`;
    }

    /** MODIFIED FUNCTION **/
    function setupActionButtons(chant) {
        const chantId = chant.id;
        const incipit = chant.incipit || 'chant';
        const rawGabcScore = extractGabcScore(chant);

        gregobaseLink.href = `https://gregobase.selapa.net/chant.php?id=${chantId}`;

        // This function returns the appropriate GABC score based on the checkbox state.
        const getProcessedGabc = () => {
            if (!rawGabcScore) return '';
            return cleanGABC.checked ? rawGabcScore.replace(cleanupRegex, '') : rawGabcScore;
        };

        if (rawGabcScore) {
            // This function updates the external links based on the current GABC score.
            const updateExternalLinks = () => {
                const processedGabc = getProcessedGabc();
                const encodedGabc = encodeURIComponent(processedGabc);
                neumzLink.href = `https://scrib.io/#q=${encodedGabc}`;
                summitLink.href = `https://editor.sourceandsummit.com/alpha/#annotation%3A%20%0A%25%25%0A${encodedGabc}`;
                illuminareLink.href = `https://editor.sourceandsummit.com/legacy/#annotation%3A%20%0A%25%25%0A${encodedGabc}`;
            };

            // 1. Set the initial state of the links on page load.
            updateExternalLinks();

            // 2. Add a listener to the checkbox to update links whenever it's toggled.
            cleanGABC.addEventListener('change', updateExternalLinks);

            // Show all GABC-related controls.
            neumzLink.style.display = 'inline-block';
            summitLink.style.display = 'inline-block';
            illuminareLink.style.display = 'inline-block';
            copyGabcBtn.style.display = 'inline-block';
            downloadGabcBtn.style.display = 'inline-block';
            if (cleanGABC.parentElement) {
                cleanGABC.parentElement.style.display = 'inline-block'; // Show checkbox
            }

        } else {
            // Hide all GABC-related controls if no GABC is available.
            neumzLink.style.display = 'none';
            summitLink.style.display = 'none';
            illuminareLink.style.display = 'none';
            copyGabcBtn.style.display = 'none';
            downloadGabcBtn.style.display = 'none';
            if (cleanGABC.parentElement) {
                cleanGABC.parentElement.style.display = 'none'; // Hide checkbox
            }
        }

        // SVG Download is unaffected by GABC.
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

        // GABC Download: Check the box state AT THE TIME OF CLICK.
        downloadGabcBtn.addEventListener('click', () => {
            const processedGabc = getProcessedGabc();
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

        // Copy GABC to Clipboard: Check the box state AT THE TIME OF CLICK.
        if (copyGabcBtn) {
            copyGabcBtn.addEventListener('click', async () => {
                const processedGabc = getProcessedGabc();
                const fullGabc = generateGabcHeader(chant) + processedGabc;
                await copyTextToClipboard(fullGabc, copyGabcBtn, "Copy GABC to Clipboard");
            });
        }
    }

    function showError(message) {
        chantIncipit.textContent = "Error";
        scoreContainer.innerHTML = `<p class="loading-message">${message}</p>`;
    }
    displayChant();
});