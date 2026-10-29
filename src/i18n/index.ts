import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import de from './locales/de/translation.json';
import en from './locales/en/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { de: { translation: de }, en: { translation: en } },
    fallbackLng: 'en',
    supportedLngs: ['de', 'en'],
    load: 'languageOnly', // ← "de-DE" → "de", "en-US" → "en"
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'rigflow_language',
      caches: ['localStorage'],
    },
});

export default i18n;

// Hilfsfunktion zum Sprachwechsel (speichert in localStorage)
export const changeLanguage = (lang: 'de' | 'en') => {
  localStorage.setItem('rigflow_language', lang);
  i18n.changeLanguage(lang);
};

export const getCurrentLanguage = (): 'de' | 'en' => {
  const lang = i18n.language;
  return lang?.startsWith('de') ? 'de' : 'en';
};
