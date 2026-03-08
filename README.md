# Rigflow

**Professionelle Inventarverwaltung für Veranstaltungstechnik**

Rigflow ist eine moderne Web-App zur Verwaltung von Event-Equipment – mit QR-Code-Integration, DMX-Patchplanung, Verleihverwaltung und Event-Sets. Optimiert für kleine bis mittelgroße Technik-Sammlungen.

[![Live Demo](https://img.shields.io/badge/Live-rigflow.lovable.app-blue?style=flat-square)](https://rigflow.lovable.app)
[![Built with React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)

---

## Features

| Feature | Beschreibung |
|---------|-------------|
| **Inventar** | Geräte verwalten mit Kategorien, Zustand, Standort, Stückpreis und Notizen |
| **QR-Codes** | Automatische QR-Generierung, Download, Druck und Kamera-Scanner |
| **DMX-Patchplan** | Adressenplanung mit Konflikt-Erkennung und Timeline-Visualisierung |
| **Checklisten** | Vor- und Nachbereitungs-Checklisten für Events |
| **Event-Sets** | Packlisten mit Artikelzuordnung und Verfügbarkeitsprüfung |
| **Verleih** | Ausleihen verwalten mit Fälligkeitsdaten und Rückgabe-Tracking |
| **Dashboard** | Übersicht mit Statistiken, aktiven Ausleihen und letzten Aktivitäten |
| **Export** | CSV, PDF und Druckansicht für Inventar, Patchplan und Packlisten |
| **Erinnerungen** | Automatische Benachrichtigungen bei überfälligen Rückgaben |
| **PWA** | Installierbar als App, offline-fähig mit Service Worker |
| **Auth** | Benutzer-Authentifizierung mit E-Mail-Verifizierung und Passwort-Reset |
| **Audit-Log** | Änderungsverlauf für alle Inventar-Aktionen |

---

## Tech-Stack

- **Frontend:** React 18 · TypeScript · Vite
- **Styling:** Tailwind CSS · shadcn/ui
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **State:** TanStack React Query
- **PDF:** jsPDF + AutoTable
- **QR:** jsQR (Scanner) · api.qrserver.com (Generator)
- **PWA:** vite-plugin-pwa · Service Worker

---

## Lokale Entwicklung

```bash
# Repository klonen
git clone https://github.com/<dein-username>/rigflow.git
cd rigflow

# Dependencies installieren
npm install

# Development Server starten
npm run dev
```

Die App läuft dann unter `http://localhost:5173`.

> **Hinweis:** Die App benötigt eine Supabase-Instanz. Die Umgebungsvariablen (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) werden über Lovable Cloud automatisch konfiguriert.

---

## Projektstruktur

```
src/
├── components/          # React-Komponenten
│   ├── ui/              # shadcn/ui Basiskomponenten
│   └── layout/          # App-Layout (Sidebar, Navigation)
├── pages/               # Seiten
│   ├── Dashboard.tsx    # Übersicht & Statistiken
│   ├── Inventory.tsx    # Inventarverwaltung
│   ├── ItemDetail.tsx   # Geräte-Detailseite
│   ├── DMXPatchplan.tsx # DMX-Adressenplanung
│   ├── Checklists.tsx   # Event-Checklisten
│   ├── EventSets.tsx    # Packlisten / Event-Sets
│   ├── Lending.tsx      # Verleihverwaltung
│   └── Auth.tsx         # Login / Registrierung
├── hooks/               # Custom Hooks (Auth, Inventory, DMX, etc.)
├── lib/                 # Utilities (Export, Print, QR, Validierung)
├── types/               # TypeScript-Typen
└── integrations/        # Supabase Client & Types
```

---

## Lizenz

MIT