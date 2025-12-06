# DMX-Patchplan Funktionsübersicht - Visuelle Erklärung

## 1. Automatische Instanz-Berechnung

### Input (InventoryItem)
```
LED-Bar
├─ Quantity: 4
├─ DMX Start Address: 1
├─ DMX Channels: 16
└─ DMX Universe: 1
```

### Verarbeitung (calculateInstanceAddresses)
```
For each of 4 instances:
  Instance 1: startAddr = 1 + (0 × 16) = 1      → 1-16
  Instance 2: startAddr = 1 + (1 × 16) = 17     → 17-32
  Instance 3: startAddr = 1 + (2 × 16) = 33     → 33-48
  Instance 4: startAddr = 1 + (3 × 16) = 49     → 49-64
```

### Output (PatchplanRows)
```
PatchplanRow[] mit 4 Einträgen:
│ ID               │ Name    │ Inst │ Start-End │ Ch │
├──────────────────┼─────────┼──────┼───────────┼────┤
│ item-id-1        │ LED-Bar │ 1/4  │ 1-16      │ 16 │
│ item-id-2        │ LED-Bar │ 2/4  │ 17-32     │ 16 │
│ item-id-3        │ LED-Bar │ 3/4  │ 33-48     │ 16 │
│ item-id-4        │ LED-Bar │ 4/4  │ 49-64     │ 16 │
```

---

## 2. Timeline Visualisierung

### Rohverlauf
```
Universe 1 (512 Kanäle verfügbar)

0     50    100   150   200   250   300   350   400   450   500   512
│─────│─────│─────│─────│─────│─────│─────│─────│─────│─────│─────│
█████────────────────────────────────────────────────────────────────
Balken 1: LED-Bar #1 (1-16) + Balken 2: LED-Bar #2 (17-32) + ...
```

### Gerenderte Timeline
```
┌──────────────────────────────────────────────────────────────────┐
│ Universe 1                                  96/512 Kanäle (19%)   │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│ [█████│    │         │                                          ] │
│  1-16  17-32  33-48  49-64  (Balken mit Labels)                 │
│                                                                    │
│ Detaillierte Übersicht:                                          │
│ ├─ LED-Bar #1/4:  1-16 (16ch)                                   │
│ ├─ LED-Bar #2/4: 17-32 (16ch)                                   │
│ ├─ LED-Bar #3/4: 33-48 (16ch)                                   │
│ └─ LED-Bar #4/4: 49-64 (16ch)                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Konflikt-Erkennung

### Szenario: Adress-Überschneidung

```
Device A: 10-20
Device B: 15-25
            ↓ Overlap erkannt!
```

### Detektionslogik
```typescript
for (row1, row2 in patchplan):
  if row1.universe == row2.universe:
    if row1.startAddr <= row2.endAddr AND 
       row2.startAddr <= row1.endAddr:
         CONFLICT FOUND ❌
```

### Ausgabe
```
┌─── FEHLER: DMX-Adresskonflikte erkannt! ─────────────────┐
│                                                             │
│ ⚠ LED-Bar #1 (10-20) überschneidet sich mit               │
│   LED-Bar #2 (15-25) in Universe 1                        │
│                                                             │
│ Lösung: Auto-Assign oder manuelle Anpassung              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Bearbeitungsablauf

### Tabellen-Ansicht mit Inline-Editing

```
┌─────────────────────────────────────────────────────────────────┐
│ Device          │ Start │ End  │ Kanäle │         Aktionen     │
├─────────────────────────────────────────────────────────────────┤
│ LED-Bar #1/4    │ [ 1  ] │ 16  │  16    │ [✓] [✗] [📋] [Auto] │
│                 │ ↑ Editierbar (Click to edit)                  │
└─────────────────────────────────────────────────────────────────┘

Benutzer gibt neue Adresse ein:
[ 1  ] → [ 20 ]
    ↓ Validierung
Neue Adressen berechnet:
- LED-Bar #1: 20-35
- LED-Bar #2: 36-51
- LED-Bar #3: 52-67
- LED-Bar #4: 68-83
    ↓ Update speichern
Patchplan aktualisiert ✓
```

---

## 5. Auto-Assign Funktion

### Ablauf

```
Benutzer klickt "Auto" für LED-Bar

1. Finde alle belegten Kanäle in Universe 1
   Belegte Kanäle: [1-16, 33-48, 65-80, 100-115]
   
2. Finde nächste Lücke
   17-32 ← Erste verfügbare Lücke

3. Prüfe ob 16 Kanäle Platz haben
   17 + 16 - 1 = 32 ✓ (≤ 512)

4. Weise zu
   LED-Bar: 17

5. Alle Instanzen werden automatisch berechnet
   #1: 17-32
   #2: 33-48
   #3: 49-64
   #4: 65-80
```

---

## 6. Universe-Verwaltung

### Multi-Universe Layout

```
┌────────────────── DMX-System ──────────────────┐
│                                                 │
│ Universe 1 (512ch)      Universe 2 (512ch)    │
│ ┌──────────────────┐  ┌──────────────────┐    │
│ │ 512/512 (100%) ▓▓│  │ 150/512 (29%) ▓ │    │
│ │ VOLL             │  │ Moderat genutzt  │    │
│ ├──────────────────┤  ├──────────────────┤    │
│ │ Moving Head 1-48 │  │ LED Walls 1-150  │    │
│ │ Strobo 49-64     │  │ Reserve: 150-512 │    │
│ │ LED Main 65-512  │  └──────────────────┘    │
│ └──────────────────┘                           │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Auslastungs-Anzeige

```
Universe 1: ████████████████ 96/512 (19%)    [GRÜN - OK]
Universe 2: ████████░░░░░░░░ 360/512 (70%)   [GELB - Warnung]
Universe 3: ██████████████░░ 480/512 (94%)   [ROT - Kritisch]
```

---

## 7. CSV-Export Format

### Eingabe
```
Click "Export" Button
```

### Output: dmx-patchplan-2024-12-06.csv
```csv
Universe,Item Name,Instance,Start Address,End Address,Channels,Condition,Location
1,"LED-Bar",1,1,16,16,verfügbar,Lager A
1,"LED-Bar",2,17,32,16,verfügbar,Lager A
1,"LED-Bar",3,33,48,16,verfügbar,Lager A
1,"LED-Bar",4,49,64,16,verfügbar,Lager A
1,"Moving Head",1,65,80,16,verfügbar,Lager B
```

---

## 8. State Management Flow

```
Inventory Items (Supabase)
         ↓
    useInventory Hook
         ↓
    allItems (gefiltert)
         ↓
    useDMXPatchplan Hook
    ├─ generatePatchplan() → patchplan[]
    ├─ findConflicts() → conflicts[]
    ├─ calculateUniverseUsage() → usage{}
    └─ updateItemDMXAddress() ← User Action
         ↓
    updateItem (Supabase)
         ↓
    Patchplan neu berechnet
         ↓
    UI aktualisiert
```

---

## 9. Validierungs-Kette

```
Benutzer gibt Adresse ein: "257"
         ↓
├─ Ist eine Zahl? ✓
│  └─ parseInt("257") = 257
│
├─ Im Bereich 1-512? ✓
│  └─ 257 >= 1 && 257 <= 512
│
├─ Genug Platz? (Menge × Kanäle) ✓
│  └─ 257 + (4 × 16) - 1 = 320 ≤ 512
│
├─ Keine Konflikte? ✓
│  └─ Keine Überschneidungen gefunden
│
└─ ✅ Adresse akzeptiert, speichern
         ↓
    Patchplan neu berechnet
         ↓
    Toast: "DMX-Adresse aktualisiert: 257-320"
```

---

## 10. Fehlerbehandlung

```
Verschiedene Fehlerfälle:

1. Adresse > 512
   ❌ "Adresse muss zwischen 1 und 512 liegen"

2. Zu viele Kanäle für Platz
   ❌ "Device benötigt 64 Kanäle. 
      Nicht genug Platz ab Adresse 450"

3. Universe-Wechsel bei Konflikt
   ⚠️  (Sofortige Konfliktauflösung)

4. Datenbank-Fehler
   ❌ "DMX-Adresse konnte nicht aktualisiert werden"
```

---

## 11. Performance-Optimierungen

```
useMemo Hooks:
├─ patchplan: Nur neu berechnet wenn allItems ändern
├─ conflicts: Nur neu berechnet wenn patchplan ändert
├─ universeUsage: Nur neu berechnet wenn patchplan ändert
└─ patchplanByUniverse: Map für schnelle Zugriffe

Komponenten:
├─ DMXTimeline: Memoized für große Listen
├─ DMXPatchplanTable: Memoized für Performance
└─ UI: Effizientes Rendering
```

---

## 12. Benutzer-Workflows

### Workflow 1: Neue Geräte hinzufügen
```
1. Gehe zu Inventory
2. Klicke "Neues Item"
3. Kategorie: "Lichttechnik"
4. DMX-Konfiguration ausfüllen
5. Speichern
6. → Sofort im Patchplan sichtbar
```

### Workflow 2: Adressen anpassen
```
1. Gehe zu DMX Patchplan
2. Tabelle-View
3. Klicke auf Start-Adresse
4. Gib neue Nummer ein
5. Bestätige mit ✓
6. → Alle Instanzen automatisch neu berechnet
```

### Workflow 3: Konflikte beheben
```
1. Sehe Konfliktwarnungen
2. Klicke "Auto" nächsten verfügbaren Platz
3. oder manuell editieren
4. Warnung verschwindet
5. → Patchplan ist valide
```

### Workflow 4: Export für Controller
```
1. Patchplan ist komplett
2. Klicke "Export" Button
3. CSV-Datei herunterladen
4. In DMX-Controller importieren
5. Fertig!
```

---

Diese Visualisierungen helfen zu verstehen, wie die DMX-Patchplan-Funktion intern arbeitet und wie Benutzer damit interagieren.
