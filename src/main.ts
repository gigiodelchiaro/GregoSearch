import './style.css';
import { initI18n, t, renderLanguageSwitcher } from './i18n';

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

const searchInput = document.getElementById('search-input') as HTMLInputElement;
const officePartFilter = document.getElementById('office-part-filter') as HTMLSelectElement;
const modeFilter = document.getElementById('mode-filter') as HTMLSelectElement;
const resultsContainer = document.getElementById('results-container')!;
const resultsCount = document.getElementById('results-count')!;
const prevPageBtn = document.getElementById('prev-page-btn') as HTMLButtonElement;
const nextPageBtn = document.getElementById('next-page-btn') as HTMLButtonElement;
const pageInfo = document.getElementById('page-info')!;

let allChants: Chant[] = [];
let currentFilteredChants: Chant[] = [];
let currentPage = 1;
const itemsPerPage = 100;

const officePartMap: { [key: string]: string } = {
  'al': 'Alleluia', 'an': 'Antiphona', 'ca': 'Canticum', 'co': 'Communio',
  'gr': 'Graduale', 'hy': 'Hymnus', 'im': 'Improperia', 'in': 'Introitus',
  'ky': 'Kyriale', 'of': 'Offertorium', 'or': 'Toni Communes', 'pa': 'Prosa',
  'pr': 'Praefationes', 'ps': 'Psalmus', 'rb': 'Responsorium breve',
  're': 'Responsorium', 'rh': 'Rhythmus', 'se': 'Sequentia', 'su': 'Supplicatio',
  'tp': 'Tropa', 'tr': 'Tractus', 'va': 'Varia'
};

const officePartColorMap: { [key: string]: string } = {
  'al': '#b0d2e8', 'an': '#e0c85c', 'ca': '#707070', 'co': '#909050',
  'gr': '#b0e070', 'hy': '#c0a080', 'im': '#8c5c44', 'in': '#d04040',
  'ky': '#4040a0', 'of': '#809070', 'or': '#e0e0a0', 'pa': '#a050a0',
  'pr': '#d080a0', 'ps': '#8090a0', 'rb': '#9c7c60', 're': '#9c7c60',
  'rh': '#e09050', 'se': '#a09070', 'su': '#d04040', 'tp': '#80d0d0',
  'tr': '#c09060', 'va': '#d0d0d0'
};
const defaultColor = '#cccccc';

function debounce<T extends (...args: any[]) => void>(func: T, delay = 300) {
  let timeout: number;
  return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => func.apply(this, args), delay);
  };
}

async function loadChants() {
  try {
    const response = await fetch('/data/chants.json');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    allChants = await response.json();
    filterAndSearch();
  } catch (error) {
    resultsContainer.innerHTML = `<p class="loading-message">${t('loading_error')}</p>`;
  }
}

function filterAndSearch() {
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

function convertToRoman(num: string): string {
  switch (num) {
    case '1': return 'I';
    case '2': return 'II';
    case '3': return 'III';
    case '4': return 'IV';
    case '5': return 'V';
    case '6': return 'VI';
    case '7': return 'VII';
    case '8': return 'VIII';
    default: return 'N/A';
  }
}

function renderPage() {
  resultsContainer.innerHTML = '';
  const totalPages = Math.ceil(currentFilteredChants.length / itemsPerPage);
  resultsCount.textContent = t('search_results_found', { count: currentFilteredChants.length });
  pageInfo.textContent = t('page_info', { currentPage, totalPages: totalPages || 1 });
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage >= totalPages;

  if (currentFilteredChants.length === 0) {
    resultsContainer.innerHTML = `<p class="loading-message">${t('no_results')}</p>`;
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

    card.innerHTML = `
      <div class="card-title">
        <h3 class="card-incipit" title="${chant.incipit}">${chant.incipit}</h3>
      </div>
      <div class="card-image-wrapper">
        <img src="https://gregobase.selapa.net/chant_img.php?id=${chant.id}" alt="${t('chant_visualization_alt', { incipit: chant.incipit })}" loading="lazy">
      </div>
      <div class="card-info">
        <div class="card-details">
          <span>
            <span class="color-chip" style="background-color: ${officePartColor};"></span>
            ${officePartName}
          </span>
          <span><strong>${t('mode')}:</strong> ${convertToRoman(chant.mode) || 'N/A'}</span>
          <span><strong>${t('version')}:</strong> ${chant.version || 'N/A'}</span>
        </div>
      </div>
    `;
    fragment.appendChild(card);
  }
  resultsContainer.appendChild(fragment);
}

function updateUIText() {
  document.querySelectorAll('[data-t]').forEach(element => {
    const key = element.getAttribute('data-t')!;
    element.textContent = t(key);
  });
  document.querySelectorAll<HTMLInputElement>('[data-t-placeholder]').forEach(element => {
    const key = element.getAttribute('data-t-placeholder')!;
    element.placeholder = t(key);
  });
}


async function init() {
  await initI18n();
  updateUIText();
  renderLanguageSwitcher(updateUIText);
  loadChants();

  searchInput.addEventListener('input', debounce(filterAndSearch));
  officePartFilter.addEventListener('change', filterAndSearch);
  modeFilter.addEventListener('change', filterAndSearch);
  prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderPage();
      window.scrollTo(0, 0);
    }
  });
  nextPageBtn.addEventListener('click', () => {
    if (currentPage < Math.ceil(currentFilteredChants.length / itemsPerPage)) {
      currentPage++;
      renderPage();
      window.scrollTo(0, 0);
    }
  });
}

init();