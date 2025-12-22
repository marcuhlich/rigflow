# QR-Code Integration - Implementierung Guide

## 🎯 Überblick

Die QR-Code Funktionalität wurde erfolgreich in die Rigflow App integriert. Sie ermöglicht:

- **QR-Code Anzeige**: Visueller QR-Code für jeden Artikel
- **QR-Code Druck**: Download und Druck von QR-Codes
- **QR-Code Scan**: Kamera-basiertes oder manuelles Scannen von QR-Codes
- **Item-Lookup**: Schneller Zugriff auf Artikel durch gescannte QR-Codes

---

## 📁 Neue Dateien

### Core-Komponenten

#### `src/lib/qrCode.ts`
Utility-Funktionen für QR-Code Generierung und Verarbeitung:
- `generateQRCodeDataUrl()` - Erzeugt QR-Code als Data-URL (nutzt api.qrserver.com)
- `downloadQRCode()` - Download des QR-Codes als PNG
- `printQRCode()` - Drucken des QR-Codes mit Formatierung
- `generateBatchQRCodes()` - Generierung von mehreren QR-Codes
- `generateBatchPrintHTML()` - HTML-Template für Batch-Druck

#### `src/hooks/useQRScanner.ts`
React-Hooks für QR-Code Scanning:
- `useQRScanner()` - Verwaltet Video-Stream und Kamera-Zugriff
  - `startScanning()` - Startet die Kamera
  - `stopScanning()` - Stoppt die Kamera
  - `scanFrame()` - Verarbeitet Frames für QR-Erkennung
- `useQRInput()` - Verwaltet manuelle Item-ID Eingabe
  - `handleInputChange()` - Verarbeitet Texteingabe
  - `handlePaste()` - Unterstützt Paste-Funktionalität
  - `validateItemId()` - Validierung des UUID-Formats

#### `src/components/QRCodeDisplay.tsx`
Dialog-Komponente zur Anzeige von QR-Codes:
- Zeigt QR-Code mit Item-Informationen
- Download-Button
- Print-Button
- Copy-ItemID-Button
- Größenoptionen: sm, md, lg

#### `src/components/QRScanner.tsx`
Scanner-Komponente mit zwei Modi:
- **Kamera-Modus**: Live-Videostream mit Echtzeit-QR-Erkennung
- **Manueller Modus**: Direkte Eingabe der Item-ID
- `QRScanner` - Export-Komponente für Integration
- `QRScannerWidget` - Kompakte Button-Komponente

#### `src/pages/ItemDetail.tsx`
Detailseite für Artikel mit:
- Vollständige Item-Informationen
- QR-Code Button
- Edit und Delete Buttons
- DMX-Konfigurationsanzeige
- Metadata (Erstellt, Aktualisiert)

---

## 🔄 Modifizierte Dateien

### `src/pages/Inventory.tsx`
- Neuer "QR-Code scannen" Button in der Kopfzeile
- Integration von `QRScanner` Komponente
- `handleQRScan()` Callback für Item-Lookup nach Scan
- `handleViewDetails()` für Navigation zu ItemDetail-Seite

### `src/components/InventoryGrid.tsx`
- QR-Code Button auf jeder Karte (neben "Bearbeiten")
- Integrierte `QRCodeDisplay` Dialog
- Prop `onViewDetails` für Navigation zu Details

### `src/components/InventoryTable.tsx`
- QR-Code Option im Dropdown-Menu
- Integrierte `QRCodeDisplay` Dialog
- Prop `onViewDetails` für Navigation zu Details
- Clickable Namen für direkten Zugriff auf Details

### `src/App.tsx`
- Neuer Route für ItemDetail: `/inventory/:id`
- Import von ItemDetail Page

---

## 🎯 Funktionen & Workflows

### 1. QR-Code Anzeigen (vom Inventory Grid)
```
Inventory Grid → Klick auf "QR" Button 
→ QRCodeDisplay Dialog öffnet sich
→ Anzeige QR-Code + Item-Informationen
→ Optionen: Download, Print, Copy ID
```

### 2. QR-Code Anzeigen (vom Inventory Table)
```
Inventory Table → Klick auf Menu (⋯)
→ Klick auf "QR-Code"
→ QRCodeDisplay Dialog öffnet sich
```

### 3. QR-Code Scannen
```
Inventory Page → Klick auf "QR-Code scannen" Button
→ QRScanner Modal öffnet sich
→ Optionen:
   a) Kamera-Modus: Live-Video-Stream
   b) Manuell-Modus: ID eingeben/einfügen
→ Nach Scan: Navigation zur ItemDetail-Seite
```

### 4. Item-Details mit QR-Code
```
ItemDetail Page Zugriff:
a) Direkt via URL: /inventory/{itemId}
b) Via Grid/Table-Click: navigation
c) Via QR-Code Scan: automatic navigation
→ Anzeige mit QR-Button, Edit, Delete
```

---

## 🔧 Technische Details

### QR-Code Generierung
- **Service**: api.qrserver.com/v1/create-qr-code/
- **Daten**: Item-ID (UUID)
- **Größen**: 200px, 300px, 400px, 500px
- **Format**: PNG
- **Farben**: Schwarz auf Weiß (Dark-Mode aware)

### Scanner-Funktionalität
- **Kamera**: HTML5 MediaDevices API
- **Video-Stream**: getUserMedia() mit constraints
- **Facing-Mode**: "environment" (Rückkamera)
- **Fallback**: Manueller ID-Input

### UUID-Validierung
```typescript
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
```

---

## 📋 UI/UX Verbesserungen

### Inventory Grid
- Kleine QR-Buttons auf jeder Karte
- Schneller Zugriff ohne Modal öffnen zu müssen

### Inventory Table
- QR-Code im Dropdown-Menu verstaut
- Platzsparend, aber leicht zugänglich

### ItemDetail Page
- Große, prominent angeordnete Buttons
- Clear Visual Hierarchy:
  - QR-Code Button (Primary)
  - Edit Button
  - Delete Button
- Item-ID in monospace Font angezeigt

### Scanner Modal
- Two-Tab Design (Kamera / Manuell)
- Live-Feedback bei Scanning
- Klare Validierungsmeldungen
- Hilfreiche Tipps für Benutzer

---

## 🚀 Nutzungsszenarien

### Szenario 1: Schnelle Item-Verwaltung
```
Benutzer möchte Item schnell finden
→ Klick auf "QR-Code scannen"
→ Scan mit Kamera
→ Automatische Navigation zur ItemDetail
→ Bearbeitung oder Anzeige der Details
```

### Szenario 2: QR-Code Drucken für Etiketten
```
Benutzer möchte QR-Code auf Etiketten drucken
→ Navigation zur ItemDetail-Seite
→ Klick auf QR-Code Button
→ Klick auf Print
→ PDF/Druck-Dialog öffnet sich
→ Print oder als PDF speichern
```

### Szenario 3: Batch-Druck von QR-Codes
```
[Zukünftige Feature]
Benutzer möchte QR-Codes für mehrere Items drucken
→ Auswahl mehrerer Items
→ Klick auf "QR-Codes drucken"
→ Batch-Print-Dialog mit 4x4 Grid
→ Druck oder PDF-Export
```

---

## 🔐 Sicherheit & Berechtigungen

### Kamera-Zugriff
- User muss explizite Berechtigung geben
- Nur zugänglich über HTTPS (außer localhost)
- Video-Stream wird gelöscht beim Schließen des Scanners

### Item-ID Format
- Strikte UUID-Validierung
- Verhindert ungültige IDs im System

---

## 📱 Browser-Kompatibilität

### MediaDevices API
- Chrome/Edge: ✅ Vollständige Unterstützung
- Firefox: ✅ Vollständige Unterstützung
- Safari: ✅ ab iOS 14
- Fallback: Manueller Input-Modus immer verfügbar

### QR-Code Generierung
- Alle modernen Browser: ✅ (HTTP GET request)
- Kein zusätzliches Paket erforderlich

---

## 🎓 Code-Beispiele

### QR-Code in Component anzeigen
```tsx
import { QRCodeDisplay } from '@/components/QRCodeDisplay';

// In JSX:
<QRCodeDisplay
  isOpen={isOpen}
  onClose={onClose}
  itemId={item.id}
  itemName={item.name}
  itemDetails={{
    category: item.category,
    quantity: item.quantity,
    location: item.location,
  }}
  size="md"
/>
```

### Scanner nutzen
```tsx
import { QRScanner } from '@/components/QRScanner';

const handleScan = (itemId: string) => {
  // Item mit dieser ID suchen
  const item = items.find(i => i.id === itemId);
  if (item) {
    navigate(`/inventory/${itemId}`);
  }
};

// In JSX:
<QRScanner
  isOpen={isScannerOpen}
  onClose={() => setIsScannerOpen(false)}
  onScan={handleScan}
/>
```

### QR-Code generieren und laden
```tsx
import { generateQRCodeDataUrl } from '@/lib/qrCode';

const loadQRCode = async (itemId: string) => {
  const dataUrl = await generateQRCodeDataUrl(
    itemId,
    { size: 300, color: '#000000', bgColor: '#ffffff' }
  );
  setQrCodeUrl(dataUrl);
};
```

---

## 🔮 Zukünftige Erweiterungen

### Phase 2: Erweiterte Features
- [ ] Batch-QR-Code Druck (4x4 oder 3x3 Grid)
- [ ] QR-Code Verwaltungs-Interface
- [ ] Scan-Historie
- [ ] QR-Code mit Custom Data (z.B. Location Tags)
- [ ] Barcode Support (neben QR)

### Phase 3: Mobile Optimierung
- [ ] Progressive Web App Mode
- [ ] Offline Scanning
- [ ] Biometric Authentication für Scans
- [ ] Touch-optimierte UI

### Phase 4: Enterprise Features
- [ ] Scan-Verlauf für Auditing
- [ ] Berechtigungen basierter QR-Zugriff
- [ ] Multi-Standort Tracking
- [ ] Integration mit Lagerverwaltungssystemen

---

## 🐛 Troubleshooting

### Kamera startet nicht
- Browser Berechtigung überprüfen
- HTTPS verwenden (außer localhost)
- Kamera Hardware überprüfen
- Fallback zu manuellem Modus nutzen

### QR-Code wird nicht erkannt
- Beleuchtung verbessern
- QR-Code frontal zur Kamera ausrichten
- Langsamer bewegen
- Manuellen Modus nutzen

### ItemID wird nicht gefunden
- UUID Format überprüfen
- Item existiert in Datenbank?
- Copy-Paste korrekt?
- Manuelle Eingabe testen

---

## 📞 Support & Kontakt

Bei Fragen oder Problemen:
1. Überprüfe die [Troubleshooting](#-troubleshooting) Sektion
2. Kontaktiere den Admin
3. Erstelle einen Issue im Repository
