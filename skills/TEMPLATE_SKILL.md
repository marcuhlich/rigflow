# TEMPLATE: Skill-Datei

Kurzbeschreibung
- Kurzer Titel: z.B. "i18n-Konventionen"
- Zweck: Beschreibe knapp, warum dieser Skill existiert.

Inhalt / Struktur
- **Zweck:** Was der Skill abdeckt.
- **Konventionen & Regeln:** Projektweite Vorgaben, z. B. i18n, Branching, Tests.
- **Typische Eingaben:** Was ein Agent/externes System braucht (User Story, Mockups, Locales).
- **Erwartete Ausgabe:** Konkrete Artefakte (Dateipfade, i18n-Keys, Tests, PR-Description).
- **Beispiel:** Minimalbeispiel für Code-Änderung oder i18n-Key.
- **Checkliste:** PR-Checks, Lint, Tests, Übersetzungen.
- **Autor & Version:** Name, Datum, ggf. Link zum Author.

Tipps
- Kurz und präzise halten.
- Verwende Beispiele mit vollständigen Pfaden (z. B. `src/components/Example.tsx`).
- Verweise auf existierende Komponenten/Patterns im Repo, wenn möglich.

Beispiel (kurz)
- Ziel: Neue Button-Komponente hinzufügen.
- Eingaben: Mockup, Locales `de`, `en`.
- Ausgabe: `src/components/PrimaryButton.tsx`, `src/i18n/de.json` key `button.primary.label`, Tests.