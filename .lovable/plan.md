

# Landing Page Redesign + Onboarding-Verbesserungen

## Probleme
1. **Platzhalter-Bild**: "QR Scanner Mockup" mit Gauge-Icon statt echtem Inhalt
2. **Mobile Header**: 3 Buttons + Logo quetschen sich, Install-Button ueberlappt
3. **Onboarding-Flow**: Die Fragen-Sektion bringt keinen echten Mehrwert, die Antworten werden kaum genutzt

## Aenderungen

### 1. Landing.tsx -- Mobile Header fix
- Header-Buttons responsiv machen: Auf Mobile nur Icon-Buttons fuer "Installieren" und "Anmelden", voller Text nur auf `sm:` aufwaerts
- "Registrieren" bleibt als primaerer Button mit Text

### 2. Landing.tsx -- Platzhalter durch echte UI-Mockups ersetzen
- Den "QR Scanner Mockup"-Block durch eine illustrative CSS/SVG-Darstellung ersetzen: ein stilisiertes Phone-Rahmen mit QR-Scan-Linien und Geraete-Icons
- Zweiten Feature-Preview-Block hinzufuegen (Inventar-Uebersicht) mit aehnlichem CSS-Mockup

### 3. Landing.tsx -- Onboarding vereinfachen
- Den mehrstufigen `questions`-Step entfernen (deviceSize/eventType Fragen bringen wenig Nutzen)
- Stattdessen: "Jetzt entdecken" fuehrt direkt zur Features-Sektion
- Features-Sektion direkt auf der Landing-Page als Scroll-Bereich einbinden (kein Step-Wechsel mehr)
- Ein einziger Flow: Hero -> Features -> CTA (alles auf einer Seite, scrollbar)

### 4. Features-Sektion -- Emojis durch Lucide-Icons ersetzen
- Alle Emoji-Icons (`📡`, `📱` etc.) durch passende Lucide-Icons ersetzen (konsistenteres Design)

### 5. Footer Jahreszahl aktualisieren
- 2025 -> 2026

## Dateien

| Datei | Aenderung |
|---|---|
| `src/pages/Landing.tsx` | Komplettes Redesign: responsive Header, CSS-Mockups, Single-Page-Flow, Lucide-Icons |

