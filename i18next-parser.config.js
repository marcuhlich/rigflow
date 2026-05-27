// i18next-parser.config.js
// Ausführen mit: npm run i18n:extract
// Scannt alle .tsx/.ts Dateien in src/ und befüllt die JSON-Dateien automatisch

/** @type {import('i18next-parser').UserConfig} */
export default {
  locales: ['de', 'en'],
  output: 'src/i18n/locales/$LOCALE/translation.json',
  input: ['src/**/*.{ts,tsx}'],

  // Vorhandene Übersetzungen behalten
  keepRemoved: false,

  // Gibt einen Hinweis für fehlende Übersetzungen
  defaultValue: (locale, namespace, key) => {
    if (locale === 'de') return key; // Deutsche Texte sind im Code als Fallback
    return ''; // Englisch muss ausgefüllt werden
  },

  // Sortiert die Schlüssel alphabetisch
  sort: true,

  // Übersetzt Leerzeichen und Zeilenumbrüche korrekt
  lineEnding: 'auto',

  // Namespace (wir nutzen nur einen)
  defaultNamespace: 'translation',
};
