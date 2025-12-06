# DMX-Patchplan Funktion

## Übersicht

Das DMX-Patchplan-System ermöglicht eine automatische und visuelle Verwaltung von DMX-Adressierungen für Lichttechnik- und Effektgeräte in deinem Inventar.

## Features

### 1. **Automatische Adressvergabe für mehrfache Geräte**
- Wenn ein Item mehrfach vorhanden ist (z.B. 4 LED-Bars), werden diese automatisch hintereinander gepatcht
- Erste Instanz: eingestellte Startadresse
- Nachfolgende Instanzen: fortlaufende Adressen basierend auf der Kanalanzahl

**Beispiel:**
- LED-Bar (4x vorhanden, 16 Kanäle pro Stück)
- Startadresse: 1
- Result:
  - Instanz 1: 1-16
  - Instanz 2: 17-32
  - Instanz 3: 33-48
  - Instanz 4: 49-64

### 2. **Chronologische Timeline-Visualisierung**
- Visuelle Darstellung aller gepatchten Geräte pro Universe
- Automatische Sortierung nach DMX-Adressen
- Responsive Balken-Grafik für intuitive Übersicht
- Detaillierte Listen mit Item-Name, Instanz-Nummer, Start/End-Adresse und Kanälen

### 3. **Konflikt-Erkennung**
- Automatische Erkennung von Adresskonflikten
- Visuelle Hervorhebung von Konflikten
- Warnung mit Details über überschneidende Geräte

### 4. **Bearbeitbare Adressen**
- Inline-Editierung von Start-Adressen in der Tabelle
- Universe-Wechsel möglich
- Alle betroffenen Adressen werden automatisch neu berechnet

### 5. **Auto-Patching**
- "Auto" Button weist automatisch den nächsten verfügbaren Kanal zu
- Verhindert Konflikte durch intelligente Adressvergabe

### 6. **Universe-Management**
- Support für mehrere DMX-Universe (bis 512 Kanäle je Universe)
- Auslastungsanzeige pro Universe
- Warnung bei über 90% Auslastung

### 7. **Export**
- CSV-Export des kompletten Patchplans
- Für weitere Verarbeitung oder externe Tools

## Technische Struktur

### Neue Dateien

#### `/src/lib/dmxPatchplan.ts`
Kernlogik für DMX-Berechnungen:
- `calculateInstanceAddresses()` - Berechnet Adressen für alle Instanzen eines Items
- `generatePatchplan()` - Erstellt kompletten Patchplan
- `findConflicts()` - Erkennt Adresskonflikte
- `calculateUniverseUsage()` - Berechnet Kanalauslastung
- `findNextAvailableChannel()` - Findet nächsten verfügbaren Kanal
- `autoResolveConflicts()` - Versucht automatisch Konflikte zu lösen
- `exportPatchplanAsCSV()` - Exportiert als CSV

#### `/src/hooks/useDMXPatchplan.ts`
React Hook für DMX-Patchplan-Verwaltung:
- Patchplan-Generierung
- Konflikt-Erkennung
- Adress-Updates mit Validierung
- Universe-Wechsel
- Auto-Assign Funktion

#### Neue Komponenten

**`/src/components/DMXTimeline.tsx`**
- Timeline-Visualisierung mit visuellen Balken
- Detaillierte Listen-Ansicht
- Hover-Effekte für Konflikt-Anzeige
- Interactive Elemente

**`/src/components/DMXPatchplanTable.tsx`**
- Tabellarische Darstellung des Patchplans
- Inline-Editierung von Adressen und Universe
- Auto-Assign Funktionalität
- Copy-to-Clipboard für Adressbereiche
- Status-Badges und Konflikt-Anzeige

**`/src/components/DMXConfigDialog.tsx`**
- Dialog für schnelle DMX-Konfiguration
- Validierung von Eingaben
- Vorschau der Adressbereichs
- Warnung bei zu vielen Kanälen

## Verwendung

### 1. DMX-Konfiguration in Items hinzufügen

Öffne ein Item (Lichttechnik- oder Effektgerät):
- **DMX-Universum**: Universum-Nummer (Standard: 1)
- **Startadresse**: Erste genutzte Adresse (1-512)
- **Kanäle**: Kanäle pro Instanz

### 2. Patchplan ansehen

Gehe auf die **DMX Patchplan**-Seite:
- **Timeline-View**: Visuelle Balken-Grafik pro Universe
- **Tabelle-View**: Detaillierte tabellarische Ansicht
- **Export**: CSV-Export für externe Tools

### 3. Adressen bearbeiten

#### In der Tabelle (inline)
- Klicke auf eine Adresse/Universe
- Gib neue Werte ein
- Bestätige oder brich ab

#### Auto-Patching
- Klicke "Auto" um nächsten verfügbaren Kanal zuzuweisen
- Automatische Konflikt-Vermeidung

### 4. Konflikte beheben

Die Seite zeigt automatisch alle Konflikte an:
- Betroffene Geräte werden rot hervorgehoben
- Details über Überschneidungen
- Nutze Auto-Patching oder manuelle Editierung

## Datentypen

### PatchplanRow
```typescript
interface PatchplanRow {
  id: string;                    // Eindeutige ID (itemId-instanceNumber)
  itemId: string;                // Item UUID
  itemName: string;              // Geräte-Name
  instanceNumber: number;        // Instanz 1, 2, 3, ...
  totalInstances: number;        // Gesamtanzahl Instanzen
  universe: number;              // DMX Universe
  startAddress: number;          // Start-Kanal (1-512)
  endAddress: number;            // End-Kanal
  channels: number;              // Kanäle pro Instanz
  condition: string;             // Geräte-Zustand
  location: string;              // Standort
}
```

### DMXConflict
```typescript
interface DMXConflict {
  row1: PatchplanRow;
  row2: PatchplanRow;
  universe: number;
}
```

## Best Practices

### Adressplanung
1. **Nutze Auto-Patching** für schnelle Konfiguration
2. **Achte auf Universe-Auslastung** (visuell in Farbe angezeigt)
3. **Gruppiere ähnliche Geräte** in einem Universe
4. **Reserviere Platz** für zukünftige Erweiterungen

### Organisation
- Pro Universe max. 512 Kanäle
- Bei vielen Geräten mehrere Universe nutzen
- Konsistente Startadresskellenzergabe pro Gerätetyp

### Exports
- CSV-Export für externe DMX-Controller
- Regelmäßig aktualisieren bei Änderungen

## Beispiel-Szenarios

### Szenario 1: Studio mit 2x Moving Head + 4x LED-Bars
```
Universe 1:
- Moving Head 1: 1-16
- Moving Head 2: 17-32
- LED-Bar 1: 33-48
- LED-Bar 2: 49-64
- LED-Bar 3: 65-80
- LED-Bar 4: 81-96
Auslastung: 96/512 (19%)
```

### Szenario 2: Großveranstaltung mit mehreren Universe
```
Universe 1: Scheinwerfer + Moving Heads (512/512 - 100%)
Universe 2: LED-Bars + Effekte (300/512 - 59%)
Universe 3: Reserve für neue Geräte (50/512 - 10%)
```

## Validierungen

- **Adressbereich**: 1-512 pro Universe
- **Kanalanzahl**: Multipliziert mit Menge darf 512 nicht überschreiten
- **Konflikt-Erkennung**: Automatische Warnung bei Überschneidungen
- **Universe**: Muss >= 1 sein

## Zukunftserweiterungen

Mögliche Features:
- Profil-basierte Auto-Konfiguration (Presets für bekannte Geräte)
- Drag & Drop Adress-Umordnung
- DMX-Datenbank mit Standard-Geräten
- Patch-Vorlagen speichern
- Multi-Universe Visualisierung
