---
title: "QR Scanning"
description: "So funktioniert das Scannen von Equipment"
---

# QR Scanning

Mit RigFlow kannst du Equipment blitzschnell per QR-Code scannen und verwalten.

## So funktioniert's

### 1. QR-Codes generieren

Generiere QR-Codes direkt in der App:

```typescript
// Beispiel: QR-Code für ein Item generieren
const qrCode = await rigflow.generateQR({
  itemId: "cam-001",
  format: "svg",
  size: 256
});
```

### 2. Equipment scannen

Öffne den Scanner in der App und halte die Kamera auf den QR-Code:

- **Einzel-Scan** – Ein Item scannen
- **Batch-Scan** – Mehrere Items nacheinander
- **Gruppen-Scan** – Ganzes Case scannen

### 3. Aktionen auslösen

Nach dem Scan kannst du:

- ✅ Check-out durchführen
- 📋 Details anzeigen
- 🔄 Status ändern
- 📸 Zustandsfoto machen

## QR-Code Formate

| Format | Verwendung | Größe |
|--------|-----------|-------|
| SVG | Digital / Print | Beliebig |
| PNG | Print | 300 DPI |
| PDF | Etiketten | A4 / Rolle |

## Offline-Modus

Der Scanner funktioniert auch **offline**. Scans werden lokal gespeichert und bei Verbindung synchronisiert.

```
Scan → Lokale Queue → Sync → Server
```

## Tipps

> Drucke QR-Codes auf wetterfeste Etiketten für Outdoor-Equipment.
