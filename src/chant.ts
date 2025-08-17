import './style.css';
import { initI18n, t, renderLanguageSwitcher } from './i18n';

declare global {
  interface Window {
    exsurge: any;
  }
}

interface Chant {
  id: number;
  incipit: string;
  'office-part': string;
  mode: string;
  version: string;
  gabc: string;
  commentary?: string;
  transcriber?: string;
}

document.addEventListener('DOMContentLoaded', async () => {
    await initI18n();
    updateUIText(); // Call updateUIText after initI18n
    renderLanguageSwitcher(updateUIText); // Render language switcher

  let currentChant: Chant | null = null;

  const chantIncipit = document.getElementById('chant-incipit') as HTMLHeadingElement;
  const metadataContainer = document.getElementById('chant-metadata') as HTMLElement;
  const scoreContainer = document.getElementById('chant-score') as HTMLElement;
  const gabcSourceTextarea = document.getElementById('gabc-source-hidden') as HTMLTextAreaElement;
  const pageTitle = document.querySelector('title')!;

  const gregobaseLink = document.getElementById('gregobase-link') as HTMLAnchorElement;
  const neumzLink = document.getElementById('neumz-link') as HTMLAnchorElement;
  const summitLink = document.getElementById('summit-link') as HTMLAnchorElement;
  const illuminareLink = document.getElementById('illuminare-link') as HTMLAnchorElement;
  const benedictusLink = document.getElementById('benedictus-link') as HTMLAnchorElement;
  const downloadSvgBtn = document.getElementById('download-svg-btn') as HTMLButtonElement;
  const downloadGabcBtn = document.getElementById('download-gabc-btn') as HTMLButtonElement;
  const copyGabcBtn = document.getElementById('copy-gabc-btn') as HTMLButtonElement;

  const cleanGABC = document.getElementById('clean') as HTMLInputElement;
  const MEGAcleanGABC = document.getElementById('remove') as HTMLInputElement;
  const addLineBreak = document.getElementById('line') as HTMLInputElement;
  const renderInRealTime = document.getElementById('render') as HTMLInputElement;

  const cleanupRegex = /'\d?|_|\[.+?\]|\.(?<!\([^(])(?=[^(]*?\))\d?/gm;
  const MEGAcleanupRegex = /<i>i+j.<\/i>|\*|<[^>]*>|~|\{|\}/gm;

  const officePartMap: { [key: string]: string } = { 'al': 'Alleluia', 'an': 'Antiphona', 'ca': 'Canticum', 'co': 'Communio', 'gr': 'Graduale', 'hy': 'Hymnus', 'im': 'Improperia', 'in': 'Introitus', 'ky': 'Kyriale', 'of': 'Offertorium', 'or': 'Toni Communes', 'pa': 'Prosa', 'pr': 'Praefationes', 'ps': 'Psalmus', 'rb': 'Responsorium breve', 're': 'Responsorium', 'rh': 'Rhythmus', 'se': 'Sequentia', 'su': 'Supplicatio', 'tp': 'Tropa', 'tr': 'Tractus', 'va': 'Varia' };

  function generateGabcHeader(chant: Chant): string {
    if (!chant) return '';
    const header_lines: string[] = [];
    const name = (chant.incipit || '').replace(';', ':');
    if (name) header_lines.push(`name:${name};`);
    if (chant['office-part']) header_lines.push(`office-part:${chant['office-part']};`);
    if (chant.mode) header_lines.push(`mode:${chant.mode};`);
    if (chant.transcriber) header_lines.push(`transcriber:${chant.transcriber};`);
    return header_lines.join('\n') + '\n%%\n';
  }

  function extractGabcScore(chant: Chant): string {
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

  function getProcessedGabc(rawGabcScore: string): string {
    if (!rawGabcScore) return '';
    
    let processedGabc = rawGabcScore;
    if (cleanGABC.checked) processedGabc = processedGabc.replace(cleanupRegex, '');
    if (MEGAcleanGABC.checked) processedGabc = processedGabc.replace(MEGAcleanupRegex, '');
    if (addLineBreak.checked) processedGabc = processedGabc.replaceAll("::", "::Z");

    const regex = /^((?:[^A-Z]|\([^)]*\))*)([A-Z][^,:\s]*)/;
    return processedGabc.replace(regex, (prefix, wordBlock) => {
      const correctedWord = wordBlock.charAt(0) + wordBlock.substring(1).toLowerCase();
      return prefix + correctedWord;
    });
  }

  async function displayChant() {
    const urlParams = new URLSearchParams(window.location.search);
    const chantId = parseInt(urlParams.get('id')!, 10);
    if (isNaN(chantId)) { showError(t('invalid_id')); return; }

    try {
      const response = await fetch('/data/chants.json');
      if (!response.ok) throw new Error(t('load_database_error'));
      const allChants: Chant[] = await response.json();
      const chant = allChants.find(c => c.id === chantId);

      if (!chant) { showError(t('chant_not_found', { chantId })); return; }

      currentChant = chant;

      updateUIText();
      populateMetadata(chant);
      setupActionButtons(chant);
      updateScoreDisplay();

    } catch (error: any) {
      showError(t('load_info_error'));
      console.error(error);
    }
  }
  
  function updateScoreDisplay() {
    if (!currentChant) return;

    if (renderInRealTime.checked) {
      renderGabcWithExsurge(currentChant);
    } else {
      displayScoreImage(currentChant);
    }
  }

  function displayScoreImage(chant: Chant) {
    scoreContainer.innerHTML = `<img src="https://gregobase.selapa.net/chant_img.php?id=${chant.id}" alt="${t('chant_image_alt', { incipit: chant.incipit })}">`;
  }

  function renderGabcWithExsurge(chant: Chant) {
    const rawGabcScore = extractGabcScore(chant);
    const processedGabc = getProcessedGabc(rawGabcScore);

    if (!processedGabc || !window.exsurge) {
      scoreContainer.innerHTML = `<p class="no-results-message">${t('score_unavailable_exsurge_error')}</p>`;
      return;
    }

    try {
      scoreContainer.innerHTML = `<p class="loading-message">${t('rendering_score')}</p>`;

      gabcSourceTextarea.value = processedGabc;

      const ctxt = new window.exsurge.ChantContext();
      const mappings = window.exsurge.Gabc.createMappingsFromSource(ctxt, gabcSourceTextarea.value);
      const score = new window.exsurge.ChantScore(ctxt, mappings, true);

      score.performLayoutAsync(ctxt, () => {
        score.layoutChantLines(ctxt, scoreContainer.clientWidth, () => {
          scoreContainer.innerHTML = score.createSvg(ctxt);
        });
      });
    } catch(e) {
      scoreContainer.innerHTML = `<p class="no-results-message">${t('render_gabc_error')}</p>`;
      console.error("GABC rendering error:", e);
    }
  }

  function populateMetadata(chant: Chant) {
    pageTitle.textContent = chant.incipit;
    chantIncipit.textContent = chant.incipit;
    const details = {
      [t('mode')]: convertToRoman(chant.mode),
      [t('office_part')]: officePartMap[chant['office-part']] || 'N/A',
      [t('version')]: chant.version,
      [t('transcriber')]: chant.transcriber || 'N/A',
      [t('commentary')]: chant.commentary || 'None',
    };
    let metadataHTML = `<h2>${t('details')}</h2><dl class="metadata-list">`;
    for (const [key, value] of Object.entries(details)) {
      if (value && value !== 'N/A' && value !== 'None') {
        metadataHTML += `<li><dt>${key}</dt><dd>${value}</dd></li>`;
      }
    }
    metadataHTML += '</dl>';
    metadataContainer.innerHTML = metadataHTML;
  }

  function setupActionButtons(chant: Chant) {
    const chantId = chant.id;
    const incipit = chant.incipit || 'chant';
    const rawGabcScore = extractGabcScore(chant);
    gregobaseLink.href = `https://gregobase.selapa.net/chant.php?id=${chantId}`;
    downloadSvgBtn.style.display = 'block';

    const updateExternalLinks = () => {
      const processedGabc = getProcessedGabc(rawGabcScore);
      const encodedGabc = encodeURIComponent(processedGabc);
      neumzLink.href = `https://scrib.io/#q=${encodedGabc}`;
      summitLink.href = `https://editor.sourceandsummit.com/alpha/#annotation%3A%20%0A%25%25%0A${encodedGabc}`;
      illuminareLink.href = `https://editor.sourceandsummit.com/legacy/#annotation%3A%20%0A%25%25%0A${encodedGabc}`;
      benedictusLink.href = `https://benedictus.liturgiacantada.com.br/#gabc=%0A%25%25%0A${encodedGabc}`;
    };

    const updateAll = () => {
      updateExternalLinks();
      updateScoreDisplay();
    };

    if (rawGabcScore) {
      updateExternalLinks();

      cleanGABC.addEventListener('change', updateAll);
      MEGAcleanGABC.addEventListener('change', updateAll);
      addLineBreak.addEventListener('change', updateAll);

      neumzLink.style.display = 'inline-block';
      summitLink.style.display = 'inline-block';
      illuminareLink.style.display = 'inline-block';
      copyGabcBtn.style.display = 'inline-block';
      downloadGabcBtn.style.display = 'inline-block';
      
      const cleanGABCLabel = document.querySelector<HTMLElement>('label[for="clean"]');
      if (cleanGABCLabel) {
        cleanGABCLabel.style.display = 'flex';
      }

      const MEGAcleanGABCLabel = document.querySelector<HTMLElement>('label[for="remove"]');
      if (MEGAcleanGABCLabel) {
        MEGAcleanGABCLabel.style.display = 'flex';
      }
      
      const addLineBreakLabel = document.querySelector<HTMLElement>('label[for="line"]');
      if (addLineBreakLabel) {
        addLineBreakLabel.style.display = 'flex';
      }
    }

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
    
    copyGabcBtn.addEventListener('click', () => {
      const processedGabc = getProcessedGabc(rawGabcScore);
      const fullGabc = generateGabcHeader(chant) + processedGabc;
      copyTextToClipboard(fullGabc, copyGabcBtn, t('copied'));
    });

    downloadSvgBtn.addEventListener('click', async () => {
      let svgSource = '';
      let filename = `${incipit.replace(/[^a-z0-9]/gi, '_')}.svg`;

      if (renderInRealTime.checked) {
        const svg = scoreContainer.querySelector('svg');
        if (!svg) {
          alert(t('no_svg_to_download'));
          return;
        }
        const serializer = new XMLSerializer();
        svgSource = serializer.serializeToString(svg);
        if (!svgSource.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
          svgSource = svgSource.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        if (!svgSource.match(/^<svg[^>]+xmlns:xlink="http:\/\/www\.w3\.org\/1999\/xlink"/)) {
          svgSource = svgSource.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
        }

      } else {
        const gregobaseSvgUrl = `https://gregobase.selapa.net/chant_img.php?id=${chantId}`;
        try {
          const response = await fetch(gregobaseSvgUrl);
          if (!response.ok) throw new Error(t('fetch_svg_error'));
          svgSource = await response.text();
        } catch (error: any) {
          alert(t('download_svg_error', { message: error.message }));
          console.error(t('download_svg_error', { message: error.message }), error);
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
  
  function convertToRoman(num: string | number): string {
    if (typeof num === 'string') {
        num = parseInt(num, 10);
    }
    if (isNaN(num) || num < 1 || num > 8) return String(num);
    const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
    return roman[num - 1];
  }

  async function copyTextToClipboard(text: string, buttonElement: HTMLButtonElement, successMessage: string) {
    const originalButtonText = buttonElement.textContent;
    buttonElement.textContent = successMessage;
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      buttonElement.textContent = t('copy_error');
    }
    setTimeout(() => {
      buttonElement.textContent = originalButtonText;
    }, 2000);
  }

  function showError(message: string) {
    pageTitle.textContent = t('error');
    chantIncipit.textContent = t('error');
    metadataContainer.innerHTML = '';
    scoreContainer.innerHTML = `<p class="no-results-message">${message}</p>`;
  }
  
  function updateUIText() {
    document.querySelectorAll<HTMLElement>('[data-t]').forEach(element => {
      const key = element.dataset.t!;
      element.textContent = t(key);
    });
  }

  renderInRealTime.addEventListener('change', updateScoreDisplay);
  
  displayChant();
});
