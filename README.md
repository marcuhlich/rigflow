# Rigflow

**Professionelle Inventarverwaltung für Veranstaltungstechnik**

Rigflow ist eine moderne Web-App zur Verwaltung von Event-Equipment – mit QR-Code-Integration, DMX-Patchplanung, Verleihverwaltung und Event-Sets. Optimiert für kleine bis mittelgroße Technik-Sammlungen.

[![Live Demo](https://img.shields.io/badge/Live-rigflow--web.vercel.app-blue?style=flat-square)](https://rigflow-web.vercel.app)
[![Built with React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)

---

## Demo

Zum Testen der App kann folgender Demo-Account verwendet werden:
1. https://rigflow-web.vercel.app aufrufen
2. Folgende Credentials eingeben:
    - E-Mail: demo@rigflow.app
    - Passwort: demo1234

> Hinweis: Der Demo-Account dient lediglich zum austesten bzw. anschauen der App. Deshalb sind viele Funktionen nur eingeschränlt verfügbar.

## Installation

RigFlow kann auf **mehreren Wegen verwendet werden**.

| Plattform | Nutzung |
|-----------|--------|
| Browser | Direkt ohne Installation |
| Android / iOS | Als installierbare PWA |
| Windows | Desktop-App |

---

- ### Browser

    Die einfachste Nutzung.

    ➡️ **RigFlow öffnen**

    https://rigflow-web.vercel.app

    Keine Installation erforderlich – einfach anmelden und starten.

- ### Mobile App (PWA)

    RigFlow kann auf Smartphones wie eine **normale App installiert werden**.

    #### Android

    1. RigFlow in **Chrome** öffnen  
    2. Menü **⋮ (3 Punkte)** öffnen  
    3. **„Zum Startbildschirm hinzufügen“** auswählen  

    Die App erscheint anschließend auf dem Home-Screen.

    #### iOS

    1. RigFlow in **Safari** öffnen  
    2. **Teilen-Button** drücken  
    3. **„Zum Home-Bildschirm“** auswählen  


- ### Desktop App

    Für Windows gibt es eine **native Desktop-Version**.

    Download:  
    https://github.com/marcuhlich/rigflow-desktop

    Installation:

    1. Release herunterladen  
    2. Setup ausführen  
    3. RigFlow starten  

---

## Dokumentation
Eine ausführliche Dokumentation unter: https://rigflow-docs.vercel.app/

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

Repository klonen:

```bash
git clone https://github.com/marcuhlich/rigflow.git
cd rigflow
```

Dependencies installieren:
```bash
npm install
```
Development Server starten:
```bash
npm run dev
```
Die App läuft anschließend unter:
```
http://localhost:8080
```


## Projektstruktur
```
src/
├── components/          # React-Komponenten
│   ├── ui/              # shadcn/ui Basiskomponenten
│   └── layout/          # Layout (Sidebar, Navigation)
│
├── pages/               # Seiten
│   ├── Dashboard.tsx
│   ├── Inventory.tsx
│   ├── ItemDetail.tsx
│   ├── DMXPatchplan.tsx
│   ├── Checklists.tsx
│   ├── EventSets.tsx
│   ├── Lending.tsx
│   └── Auth.tsx
│
├── hooks/               # Custom Hooks
├── lib/                 # Utilities
├── types/               # TypeScript Typen
└── integrations/        # Supabase Integration
```

## Lizenz
[LICENSE.txt](public/LICENSE.txt)