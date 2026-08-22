# SKILL: Implementierungsleitfaden für Feature-Entwicklung

Zweck
- Diese Datei fasst alles zusammen, was ein interner Agent oder eine externe KI (ohne Zugriff auf die Codebase) wissen muss, um ein Feature korrekt in Rigflow zu implementieren.

Kurz: Erwartungen
- Keine Secrets oder Zugangsdaten in Commits.
- Strings nicht hartkodieren — immer Übersetzungs-JSONs aktualisieren.
- Tests hinzufügen / bestehende Tests anpassen.
- Code konsistent mit bestehenden Patterns schreiben (Komponenten, Hooks, Services, Types).

Projektüberblick (wichtigste Orte)
- Frontend-Quellcode: src/
- Komponenten: src/components/
- Hooks/Context: src/hooks/, src/contexts/
- Typen: src/types/
- Übersetzungen / i18n: src/i18n/ (Locale-JSONs)
- Services / API-Clients: src/services/ oder src/lib/
- Supabase-Serverfunktionen: supabase/functions/
- Assets: assets/ und public/

Wichtige Konventionen
- Internationalisierung (i18n)
  - Alle sichtbaren Texte müssen lokalisiert werden. Nicht in UI-Strings schreiben.
  - Neue Texte immer in den Übersetzungs-JSONs anlegen (pro Locale eine Datei). Beispiel:
    - Füge den Schlüssel `feature.new.title` zu beiden Locale-Dateien hinzu: `src/i18n/de.json` und `src/i18n/en.json` (oder den vorhandenen Locale-Dateien).
    - Beispiel-Keys:
      - `feature.new.title": "Neues Feature"` (de)
      - `feature.new.title": "New feature"` (en)
  - Im Code: Übersetzungen über den vorhandenen i18n-Hook verwenden, z.B. `const { t } = useTranslation()` und danach `t('feature.new.title')`.
  - Bei Platzhaltern Parameter verwenden: `t('component.welcome', { name })`.
  - Wenn UI-Text mehrere Sätze oder HTML enthält, pflege ihn als einzelnes Key mit Markdown/HTML nur wenn das Projekt es unterstützt.

- Komponenten-Pattern
  - Komponenten in `src/components/` platzieren, nach Funktion in Unterordnern organisieren.
  - Presentational-Komponenten (UI-only) vs Container-Komponenten trennen, wenn sinnvoll.
  - Props-Interfaces in `src/types/` definieren und wiederverwenden.
  - Vermeide Inline-Styles; verwende die bestehende Styling-Lösung (Tailwind wird verwendet — `tailwind.config.ts`).

- State & Datenzugriff
  - Globaler Undo/Redo: `src/contexts/UndoRedoContext.tsx` vorhanden — benutze vorhandene Contexts/Hooks für globale Änderungen.
  - Business-Logik in Hooks oder Services auslagern (z.B. `src/hooks/` oder `src/services/`).
  - API-Aufrufe zentralisieren (z.B. `src/services/api.ts` oder `supabase/`-Functions).

- Typensicherheit
  - Typs in `src/types/` anlegen oder erweitern.
  - Keine `any`-Typen ohne triftigen Grund; wenn nötig, mit TODO kommentieren

- Formulare & Validation
  - Nutze bestehende Form-Patterns und Validations-Libraries (falls vorhanden).
  - Validierungsfehler lokalisiert zurückgeben (Fehlermeldungen als Keys in i18n).

- Medien & Assets
  - Bilder in `assets/` oder `public/` ablegen.
  - Für App-Icons und native builds: `icons/` verwenden und Capacitor/Android-spezifische Ressourcen in `android/` nicht manuell überschreiben ohne Build-Test.

- Tests
  - Unit- oder Integrationstests für neue Logik hinzufügen (jest/Testing Library falls eingerichtet).
  - Komponenten-Tests sollten i18n umschließen (Provider/Mocks) oder Schlüssel in Tests mocked werden.

- Builds & lokale Entwicklung
  - Dev-Server: `npm run dev` (oder `pnpm`/`bun` je nach Projekt) — benutze die vorhandene Scripts in `package.json`.
  - Native / Capacitor: für Android-Builds den Ordner `android/` verwenden und `npx cap sync`/`npx cap open android` wie nötig.

- Sicherheits- & Geheimhaltungsregeln
  - Niemals Secrets, API-Keys oder Credentials committen.
  - Environment-Variablen in `.env` lokal, in CI als Secret-Variablen.

- Supabase / Serverless-Funktionen
  - Diese müssen manuell im Supabase-Dashboard angelegt/geändert werden

- Accessibility
  - Behalte ARIA-Attribute, Tastaturzugänglichkeit und Kontrast im Blick.
  - UI-Elemente sollten semantisch korrekt sein (Buttons vs divs, form labels etc.).

Guidelines für externe KI/Agenten (ohne Repo-Zugriff)
- Eingaben, die du brauchst:
  - Ziel des Features in Worten (User Story), inklusive Akzeptanzkriterien.
  - Screenshots / Mockups oder Design-Links.
  - Liste der zu unterstützenden Locales (z. B. `de`, `en`).
  - Falls API-Endpunkte geändert werden müssen: OpenAPI-Spec oder Beispiel-Request/Response.
  - Falls DB-Änderungen nötig: Liste der neuen Felder und Datentypen.

- Was du als Vorschlag liefern musst:
  - 1: Konkrete Code-Änderungen: Dateien / Funktionssignaturen / Keys, die geändert oder angelegt werden sollen.
  - 2: Konkrete i18n-Keys (z. B. `feature.xxx.title`, `feature.xxx.description`) mit Textvorschlägen für jede Locale.
  - 3: Tests die hinzugefügt/angepasst werden müssen (Test-Dateien, Assertions).
  - 4: Eine Schritt-für-Schritt Anleitung, wie der Entwickler lokal testen kann (Commands).

- Einschränkungen für externe Agenten
  - Wenn Backend-Zugriff nötig ist, beschreibe die API-Änderungen so, dass ein Entwickler sie implementieren kann.

Beispiel-Workflow: Neues Feature hinzufügen (kurz)
1. Erhalte User Story, Mockups und Locale-Liste.
2. Definiere neue i18n-Keys und liefere Übersetzungsvorschläge.
3. Liste neue/zu ändernde Dateien auf (z.B. `src/components/NewFeature.tsx`, `src/hooks/useNewFeature.ts`, `src/i18n/de.json`, `src/i18n/en.json`, `src/types/newFeature.ts`).
4. Schreibe Pseudocode / Code-Snippets für den Entwickler.
5. Beschreibe Tests und Befehle zum lokalen Testen (`npm run dev`, `npm run test`).


Kontakt & Nachfragen
- Wenn etwas unklar ist: frage den Entwickler, bevor du Annahmen triffst. Es ist besser, einmal nachzufragen als falsche Änderungen vorzuschlagen.
- Bei Unsicherheit über Konventionen: kurze Codebeispiele oder Verweise auf ähnliche Komponenten im src/components/-Ordner.