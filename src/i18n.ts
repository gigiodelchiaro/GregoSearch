let translations: any = {};
let currentLang: string;

async function loadTranslations(lang: string): Promise<void> {
  try {
    const response = await fetch(`/locales/${lang}.json`);
    if (!response.ok) {
      throw new Error(`Could not load ${lang}.json`);
    }
    translations = await response.json();
    currentLang = lang;
  } catch (error) {
    console.error(error);
    // Fallback to English if the language file is not found
    if (lang !== 'en') {
      await loadTranslations('en');
    }
  }
}

function getLanguage(): string {
  const lang = navigator.language.split('-')[0];
  return ['en', 'pt'].includes(lang) ? lang : 'en';
}

export function t(key: string, vars: { [key: string]: string | number } = {}): string {
  let translation = translations[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    translation = translation.replace(`{${k}}`, String(v));
  }
  return translation;
}

export async function initI18n(): Promise<void> {
  const lang = getLanguage();
  await loadTranslations(lang);
}

export function renderLanguageSwitcher(updateUITextCallback: () => void) {
  const switcherContainer = document.getElementById('language-switcher');
  if (!switcherContainer) return;

  switcherContainer.innerHTML = ''; // Clear existing buttons

  const languages = ['en', 'pt']; // Add more languages here as needed

  languages.forEach(lang => {
    const button = document.createElement('button');
    button.textContent = lang.toUpperCase();
    button.classList.add('lang-switcher-btn');
    if (lang === currentLang) {
      button.classList.add('active');
    }
    button.addEventListener('click', async () => {
      if (lang !== currentLang) {
        await loadTranslations(lang);
        document.documentElement.lang = lang; // Update HTML lang attribute
        updateUITextCallback(); // Re-render all localized text
        renderLanguageSwitcher(updateUITextCallback); // Re-render switcher to update active state
      }
    });
    switcherContainer.appendChild(button);
  });
}
