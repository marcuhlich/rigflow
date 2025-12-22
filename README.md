# Rigflow Inventory App

Professionelle Verwaltungssoftware für Event-Equipment mit QR-Code-Integration und DMX-Patchplan.

## Features

### 📦 Inventarverwaltung
- **Übersichtsansicht**: Grid- oder Tabellenformat für alle Geräte
- **Detailseiten**: Vollständige Geräteinformationen mit QR-Codes
- **Filterung & Suche**: Nach Status, Typ und Eigenschaften
- **Statistiken**: Bestandsverfolgung in Echtzeit

### 🔲 QR-Code Funktionalität
- **Automatische Generierung**: QR-Codes für jedes Gerät
- **Anzeige & Download**: Mit item-spezifischen Details
- **Drucken**: Vorbereitet für Etikettenausgabe
- **Scanner**: Kamera-basiertes Scanning oder manuelle UUID-Eingabe
- **Batch-Export**: Mehrere QR-Codes gleichzeitig generieren

### 🎛️ DMX-Patchplan
- **Adressenverwaltung**: DMX-Adressen (1-512) pro Universe
- **Konflikt-Erkennung**: Automatische Warnung bei Adressüberlappungen
- **Timeline-Visualisierung**: Grafische Darstellung von Adressenbelegung
- **Mehrreihiges Layout**: Automatische Verteilung überlappender Geräte

### 👤 Authentifizierung
- **Supabase-Integration**: Sichere Benutzer-Verwaltung
- **Session-Persistierung**: Automatisches Logout nach Inaktivität
- **Passwort-Reset**: Email-gestützte Wiederherstellung

## Tech-Stack

- **Frontend**: React 18.3 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI-Komponenten**: shadcn/ui
- **Backend**: Supabase (PostgreSQL)
- **QR-Generierung**: api.qrserver.com
- **Deployment**: Vite SPA

## Installation

```bash
# Dependencies installieren
bun install

# Development Server starten
bun run dev

# Production Build
bun run build
```

## Projekt-Struktur

```
src/
├── components/          # React-Komponenten
│   ├── ui/             # shadcn/ui Components
│   ├── layout/         # Layout-Komponenten
│   ├── FilterBar.tsx
│   ├── InventoryGrid.tsx
│   ├── InventoryTable.tsx
│   ├── QRCodeDisplay.tsx
│   └── QRScanner.tsx
├── pages/              # Seiten/Views
│   ├── Auth.tsx
│   ├── Dashboard.tsx
│   ├── Inventory.tsx
│   ├── ItemDetail.tsx
│   └── DMXPatchplan.tsx
├── hooks/              # Custom React Hooks
│   ├── useAuth.tsx
│   ├── useInventory.ts
│   └── useQRScanner.ts
├── lib/                # Utility-Funktionen
│   ├── qrCode.ts       # QR-Generierung
│   ├── dmxPatchplan.ts # DMX-Logik
│   └── utils.ts
├── types/              # TypeScript Typen
└── integrations/       # Backend-Integration
    └── supabase/

```

## Datenbankschema

### Items
```sql
- id (UUID, PK)
- name (String)
- type (String)
- status (online/in-use/repair)
- quantity (Integer)
- location (String)
- created_at (Timestamp)
```

### DMX Config
```sql
- id (UUID, PK)
- item_id (UUID, FK)
- universe (Integer)
- start_address (Integer 1-512)
- end_address (Integer 1-512)
- instance (Integer)
```

## Usage

### Item hinzufügen
1. **Inventory** → **+ Neues Item**
2. Form ausfüllen (Name, Typ, Eigenschaften)
3. Optional: DMX-Adressen konfigurieren
4. **Speichern** → Automatischer QR-Code wird generiert

### QR-Code verwenden
1. **Item öffnen** → QR-Button klicken
2. **Download**: Bild herunterladen
3. **Drucken**: Direkt drucken auf Etiketten
4. **Scannen**: Scanner-Icon in Inventory nutzen

### DMX konfigurieren
1. **DMX Patchplan** → Universe auswählen
2. **Gerät hinzufügen** → Adressen eingeben
3. **Konflikte**: Rote Warnung wenn Adressen überlappen
4. **Visualisierung**: Timeline zeigt alle Belegungen

## Features in Entwicklung

- [ ] Batch-Operationen (mehrere Items gleichzeitig ändern)
- [ ] Export-Funktionen (CSV, PDF)
- [ ] Abhängigkeitsverfolgung (Zubehör-Sets)
- [ ] Audit-Log (Änderungsverlauf)
- [ ] Multi-Language Support

## Lizenz

MIT

