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
    const MEGAcleanGABC = document.getElementById('remove'); // checkbox
    const copyGabcBtn = document.getElementById('copy-gabc-btn');

    // Regex to remove accents, underscores, brackets, and periods within parentheses.
    const cleanupRegex = /'\d?|_|\[.+?\]|\.(?<!\([^(])(?=[^(]*?\))\d?/gm;
    const MEGAcleanupRegex = /<i>i+j.<\/i>|\*|<[^>]*>|~|\{|\}/gm;

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
    // Return early if there's no gabc property
    if (!chant || !chant.gabc) {
        return '';
    }

    try {
        const parsedData = JSON.parse(chant.gabc);

        // CASE 1: The parsed data is an array (your original working case)
        if (Array.isArray(parsedData)) {
            const gabcEntry = parsedData.find(entry => Array.isArray(entry) && entry[0] === 'gabc');
            return gabcEntry ? gabcEntry[1].trim() : '';
        }
        // CASE 2: The parsed data is a string (your failing case)
        else if (typeof parsedData === 'string') {
            return parsedData.trim();
        }
        // If it's something else (e.g., a number, boolean, or object), return empty
        else {
            return '';
        }
    } catch (e) {
        // This catch block will now handle cases where chant.gabc is NOT valid JSON at all.
        // For example, if it's just "(c4) BE...", without the surrounding quotes.
        // In that situation, we can assume the raw string is what we want.
        if (typeof chant.gabc === 'string') {
             return chant.gabc.trim();
        }
        console.error("Could not extract GABC score:", e);
        return '';
    }
}
    async function copyTextToClipboard(text, buttonElement, originalButtonText) {
        if (!text) {
            alert('No content available to copy.');
            return;
        }
        buttonElement.textContent = 'Copiando...';
        buttonElement.disabled = true;
        try {
            await navigator.clipboard.writeText(text);
            buttonElement.textContent = 'Copiado!';
            setTimeout(() => {
                buttonElement.textContent = originalButtonText;
                buttonElement.disabled = false;
            }, 1500);
        } catch (err) {
            console.error('Falha ao copiar o texto: ', err);
            buttonElement.textContent = 'Falha ao copiar!';
            alert('Falha ao copiar');
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
        if (isNaN(chantId)) { showError("ID inválido."); return; }
        try {
            const response = await fetch('data/chants.json');
            if (!response.ok) throw new Error("Não foi possível carregar o banco de dados");
            const allChants = await response.json();
            const chant = allChants.find(c => c.id === chantId);
            if (!chant) { showError(`ID ${chantId} não encontrado.`); return; }
            populateMetadata(chant);
            displayScoreImage(chant);
            setupActionButtons(chant);
        } catch (error) {
            showError("Erro ao carregar as informações");
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
        scoreContainer.innerHTML = `<img src="https://gregobase.selapa.net/chant_img.php?id=${chant.id}" alt="Imagem de ${chant.incipit}">`;
    }

    /** MODIFIED FUNCTION **/
    function setupActionButtons(chant) {
        const chantId = chant.id;
        const incipit = chant.incipit || 'chant';
        const rawGabcScore = extractGabcScore(chant);
        gregobaseLink.href = `https://gregobase.selapa.net/chant.php?id=${chantId}`;

        // This function returns the appropriate GABC score based on the checkbox state.
        const getProcessedGabc = () => {

            if (!rawGabcScore) {
                return '';
            }

            let processedGabc = rawGabcScore;

            if (cleanGABC.checked) {
                processedGabc = processedGabc.replace(cleanupRegex, '');
            }

            if (MEGAcleanGABC.checked) {
                processedGabc = processedGabc.replace(MEGAcleanupRegex, '');
            }

            // This function and regex fixes capitalization of words.
            // "(f3) EC(ce!fg)CE(f.) *(,) ad(fe~)vé(f!gwh_f)nit(f.)"
            // becomes
            // "(f3) Ec(ce!fg)ce(f.) *(,) ad(fe~)vé(f!gwh_f)nit(f.)"
            const regex = /^((?:[^A-Z]|\([^)]*\))*)(([A-Z][^,:\s]*))/;
            
            const finalGabc = processedGabc.replace(regex, (fullMatch, prefix, wordBlock) => {

                const correctedWord = wordBlock.charAt(0) + wordBlock.substring(1).toLowerCase();
                // Re-assemble the string with the corrected word block.
                return prefix + correctedWord;
            });

            return finalGabc;
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
            MEGAcleanGABC.addEventListener('change', updateExternalLinks);

            // Show all GABC-related controls.
            neumzLink.style.display = 'inline-block';
            summitLink.style.display = 'inline-block';
            illuminareLink.style.display = 'inline-block';
            copyGabcBtn.style.display = 'inline-block';
            downloadGabcBtn.style.display = 'inline-block';
            cleanGABC.parentElement.style.display = 'inline-block'
            MEGAcleanGABC.parentElement.style.display = 'inline-block'

        }

        // SVG Download is unaffected by GABC.
        downloadSvgBtn.addEventListener('click', async () => {
            const originalText = downloadSvgBtn.textContent;
            downloadSvgBtn.textContent = 'Baixando...';
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
                console.error('Download falhou:', error);
                alert('Não foi possível baixar o SVG.');
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
                await copyTextToClipboard(fullGabc, copyGabcBtn, "Copiar GABC");
            });
        }
    }

    function showError(message) {
        chantIncipit.textContent = "Erro";
        scoreContainer.innerHTML = `<p class="loading-message">${message}</p>`;
    }
    displayChant();
});