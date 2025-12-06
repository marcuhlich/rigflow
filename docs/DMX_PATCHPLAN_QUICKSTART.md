# DMX-Patchplan Quick-Start Guide

## 5-Minuten Setup

### Schritt 1: Erstes Gerät hinzufügen

1. **Inventory → Neues Item**
   - Name: `LED-Bar PAR 64`
   - Kategorie: `Lichttechnik` (wichtig!)
   - Menge: `4`
   - Standort: `Lager A`
   - Zustand: `verfügbar`

2. **DMX-Konfiguration ausfüllen**
   - **Universe**: `1` (Standard)
   - **Start-Adresse**: `1`
   - **Kanäle**: `16` (pro Gerät)
   - Speichern ✓

3. **Was passiert automatisch?**
   ```
   ✓ 4 Instanzen werden berechnet:
     #1: 1-16
     #2: 17-32
     #3: 33-48
     #4: 49-64
   ```

---

### Schritt 2: Patchplan anschauen

1. **Gehe zu: Seite → DMX Patchplan**

2. **Wähle Ansicht:**
   - 🎨 **Timeline View** (Standard): Balken-Grafik
   - 📊 **Tabelle View**: Detaillierte Übersicht

3. **Was siehst du?**
   - 4 LED-Bars mit Adressen
   - Universe 1: 64/512 Kanäle (12%)
   - Keine Konflikte ✓

---

### Schritt 3: Weitere Geräte hinzufügen

**Option A: Manuell eingeben**
```
Moving Head
├─ Menge: 2
├─ Kategorie: Lichttechnik
├─ Start-Adresse: 65 (nach LED-Bars)
└─ Kanäle: 16
   → Adressen: 65-80, 81-96
```

**Option B: Auto-Assign nutzen**
```
1. Gib Start-Adresse: 1 ein (oder beliebig)
2. Gehe zu Patchplan
3. Klicke "Auto" Button
4. Nächster freier Platz wird automatisch genutzt
```

---

### Schritt 4: Adressen anpassen

**In der Tabelle:**
1. Klicke auf eine Start-Adresse (z.B. "65")
2. Gib neue Nummer ein (z.B. "100")
3. Drücke ✓ zum Bestätigen
4. **Automatisch:** Alle nachfolgenden Geräte passen sich an!

**Beispiel:**
```
Vorher:
├─ LED-Bar: 1-64
├─ Moving Head: 65-96
└─ Strobe: 97-112

Nach Änderung (Moving Head → 200):
├─ LED-Bar: 1-64
├─ Moving Head: 200-231
└─ Strobe: 97-112
   (Strobe bleibt unverändert)
```

---

### Schritt 5: Konflikte beheben

**Wenn eine Warnung erscheint:**
```
⚠ Konflikt: LED-Bar (1-16) 
         überschneidet sich mit
           Moving Head (10-25)
```

**Drei Lösungen:**

1. **Auto-Assign** (Einfachste)
   ```
   Klicke "Auto" beim Moving Head
   → Nächster freier Platz: 65-96
   ```

2. **Manuell editieren**
   ```
   Klicke auf Moving Head Start-Adresse
   Gib ein: 65
   Bestätige mit ✓
   ```

3. **Zu anderem Universe**
   ```
   Klicke Universe bei Moving Head
   Gib ein: 2
   → Kein Konflikt mehr in Universe 2
   ```

---

## Häufige Szenarien

### Szenario 1: Studio Setup (einfach)

```
Timeline ansehen:
┌─ Universe 1 ──────────────────────────────────┐
│ [████]────────────────────────────────────────│ 64/512
│                                                │
│ LED-Bar #1-4:  1-64 (4×16)                   │
│ Strobe #1-2:   65-80 (2×8)                   │
│ Reserve:       81-512 (Für später)            │
└────────────────────────────────────────────────┘
```

### Szenario 2: Großveranstaltung (mehrere Universe)

```
┌─ Universe 1: 512/512 (100%) - VOLL ─────────┐
│ Moving Heads, Main Lights, Strobes           │
└────────────────────────────────────────────┘

┌─ Universe 2: 200/512 (39%) - Moderate ──────┐
│ LED Walls, Effektlichter, Seitenlights      │
└────────────────────────────────────────────┘

┌─ Universe 3: 50/512 (10%) - Reserve ────────┐
│ Für kurzfristige Änderungen/Ergänzungen      │
└────────────────────────────────────────────┘
```

### Szenario 3: Duplikate anpassen

Problem: Hast 4 LED-Bars, aber nur 2 sollten in Universe 1 sein

```
Vorher (alle in Universe 1):
LED-Bar #1: 1-16
LED-Bar #2: 17-32
LED-Bar #3: 33-48
LED-Bar #4: 49-64

Gewünscht:
Ledbar #1-2: Universe 1 (1-32)
LED-Bar #3-4: Universe 2 (1-32)

Problem: Nur eine Start-Adresse pro Item!
Lösung: Teile in zwei Items auf
```

---

## Tipps & Tricks

### 💡 Tipp 1: Standard-Geräte kennen
```
Moving Head: meist 16-20 Kanäle
LED-Bar: 3-16 Kanäle (RGB oder RGBW)
Strobe: 2-4 Kanäle
Par: 3-4 Kanäle (RGB)
```

### 💡 Tipp 2: Adressblöcke planen
```
1-100: Moving Heads
101-200: LED-Wände
201-350: LED-Bars/Pars
351-512: Reserve/Effekte
```

### 💡 Tipp 3: Multiple Universe nutzen
```
Statt alles in Universe 1:
├─ Universe 1: Hauptbeleuchtung (z.B. 450/512)
├─ Universe 2: Effekte (z.B. 250/512)
└─ Universe 3: Reserve (z.B. 100/512)

Bessere Auslastung und Fehlertoleranz!
```

### 💡 Tipp 4: CSV-Export nutzen
```
1. Patchplan ist korrekt
2. Klicke "Export"
3. CSV in DMX-Controller importieren
4. Oder im Team teilen (Google Drive, Email)
```

### 💡 Tipp 5: Regelmäßig Update
```
Nach jeder Änderung:
1. Patchplan überprüfen
2. Keine Konflikte?
3. Auslastung OK?
4. → CSV neu exportieren
```

---

## Tastenkombinationen & Shortcuts

| Aktion | Wie | Effekt |
|--------|-----|--------|
| Adresse ändern | Klick auf Zahl | Inline-Edit |
| Edit abbrechen | [✗] Button | Änderung verwerfen |
| Edit bestätigen | [✓] Button | Änderung speichern |
| Auto-Assign | [Auto] Button | Nächster freier Platz |
| Adresse kopieren | [📋] Button | In Zwischenablage |
| Zu Tabelle | [Tabelle] Button | Detaillierte Ansicht |
| Zu Timeline | [Timeline] Button | Visuelle Ansicht |
| Export CSV | [Export] Button | Datei herunterladen |

---

## Fehlerbehandlung

### Fehler 1: "Adresse muss zwischen 1 und 512 liegen"
```
❌ Problem: Du hast 0 oder > 512 eingegeben
✅ Lösung: Nutze nur 1-512
```

### Fehler 2: "Nicht genug Platz"
```
❌ Problem: Zu viele Kanäle (4×16=64) 
           ab Adresse 470 (nur 43 frei)
✅ Lösung: Auto-Assign oder andere Adresse
           oder neues Universe nutzen
```

### Fehler 3: Konflikt-Warnung bleibt
```
❌ Problem: Zwei Geräte mit gleicher Adresse
✅ Lösung: 
   - Auto-Assign für eines der Geräte
   - Oder manuell unterschiedliche Adressen
   - Oder auf Universe 2 verschieben
```

### Fehler 4: "DMX-Konfiguration nicht sichtbar"
```
❌ Problem: Kategorie ist nicht "Lichttechnik" 
           oder "Effektgeräte"
✅ Lösung: Item-Kategorie ändern
          → DMX-Felder erscheinen
```

---

## Häufig gestellte Fragen

**F: Ich habe 3 LED-Bars. Warum nur 1 Gerät?**
```
A: Das ist normal! Ein InventoryItem = 1 Gerätetyp
   Wenn du 3 LED-Bars hast → Menge: 3 setzen
   → Automatisch 3 Instanzen im Patchplan
```

**F: Kann ich Adressen automatisch zuweisen?**
```
A: Ja! Klicke "Auto" Button
   → Nächster verfügbarer Platz wird genutzt
```

**F: Was ist ein "Universe"?**
```
A: DMX-Standard: Max. 512 Kanäle pro Universum
   Bei mehr Geräten: Universe 2, 3, 4, ... nutzen
```

**F: Wie übernehme ich den Patchplan in meine Anlage?**
```
A: 1. Patchplan im App prüfen
   2. "Export" Button → CSV-Datei
   3. In deinen DMX-Controller importieren
   4. Fertig!
```

**F: Kann ich meine Patchpläne speichern?**
```
A: Derzeit: Automatisch beim Speichern
   Zukünftig: Profil-Management geplant
```

---

## Checkliste für produktiven Einsatz

- [ ] Alle Geräte im Inventory mit DMX erfasst
- [ ] Startadressen korrekt vergeben
- [ ] Keine Konflikte vorhanden
- [ ] Universe-Auslastung geprüft
- [ ] Patchplan exportiert
- [ ] CSV in Controller importiert
- [ ] Auf Veranstaltung getestet
- [ ] Team informiert über Layout

---

## Support & Weitere Hilfe

**Bei Fragen:**
1. Siehe DMX_PATCHPLAN_README.md (detailliert)
2. Siehe DMX_PATCHPLAN_VISUALIZATION.md (visuell)
3. Siehe IMPLEMENTATION_SUMMARY.md (technisch)

**Bei Bugs:**
- Console öffnen (F12) auf Fehler prüfen
- Toast-Nachrichten beachten
- Daten in Supabase überprüfen

---

**Viel Erfolg bei der Veranstaltung! 🎉**
