# RigFlow

**Professionelle Inventarverwaltung für Veranstaltungstechnik**

RigFlow ist eine moderne Web-App zur Verwaltung von Event-Equipment – mit **QR-Code-Integration, DMX-Patchplanung, Verleihverwaltung und Event-Sets**.

Optimiert für **kleine bis mittelgroße Technik-Sammlungen**, z. B.:

- Veranstaltungstechniker
- kleine Rental-Firmen
- Schul- oder Vereins-Equipment
- private Technik-Sammlungen

[![Live Demo](https://img.shields.io/badge/Live-rigflow.lovable.app-blue?style=flat-square)](https://rigflow.lovable.app) [![Built with React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev) [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org) [![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)

---

# Nutzung / Installation

RigFlow kann auf **mehreren Wegen verwendet werden**.

| Plattform | Nutzung |
|-----------|--------|
| 🌐 Browser | Direkt ohne Installation |
| 📱 Android / iOS | Als installierbare PWA |
| 💻 Windows | Desktop-App |

---

# 🌐 Browser

Die einfachste Nutzung.

➡️ **RigFlow öffnen**

https://rigflow.lovable.app

Keine Installation erforderlich – einfach anmelden und starten.

---

# 📱 Mobile App (PWA)

RigFlow kann auf Smartphones wie eine **normale App installiert werden**.

## Android

1. RigFlow in **Chrome** öffnen  
2. Menü **⋮ (3 Punkte)** öffnen  
3. **„Zum Startbildschirm hinzufügen“** auswählen  

Die App erscheint anschließend auf dem Home-Screen.

---

## iOS

1. RigFlow in **Safari** öffnen  
2. **Teilen-Button** drücken  
3. **„Zum Home-Bildschirm“** auswählen  

---

# 💻 Desktop App

Für Windows gibt es eine **native Desktop-Version**.

Download:  
https://github.com/marcuhlich/rigflow-desktop

Installation:

1. Release herunterladen  
2. Setup ausführen  
3. RigFlow starten  

---

# Features

| Feature | Beschreibung |
|---------|-------------|
| **Inventar** | Geräte verwalten mit Kategorien, Zustand, Standort und Notizen |
| **QR-Codes** | Automatische QR-Generierung + Scanner |
| **DMX-Patchplan** | Adressenplanung mit Konflikt-Erkennung |
| **Checklisten** | Event-Vorbereitungslisten |
| **Event-Sets** | Packlisten mit Artikelzuordnung |
| **Verleih** | Geräte verleihen mit Rückgabe-Tracking |
| **Dashboard** | Statistiken und Aktivitätsübersicht |
| **Export** | CSV, PDF und Druckansichten |
| **Erinnerungen** | Hinweise bei überfälligen Rückgaben |
| **PWA** | Installierbar + Offlinefähig |
| **Auth** | Login mit E-Mail-Verifizierung |
| **Audit-Log** | Änderungsverlauf |

---

# Tech Stack

| Bereich | Technologie |
|-------|-------------|
| Frontend | React 18 · TypeScript · Vite |
| Styling | Tailwind CSS · shadcn/ui |
| Backend | Supabase |
| State | TanStack React Query |
| PDF Export | jsPDF + AutoTable |
| QR Codes | jsQR · api.qrserver |
| PWA | vite-plugin-pwa |

---

# Lokale Entwicklung

Repository klonen:

```bash
git clone https://github.com/<username>/rigflow.git
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
http://localhost:5173
```

## Environment Variablen
RigFlow benötigt eine Supabase Instanz.

Erstelle eine `.env` Datei:

```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

Bei Deployments über Lovable Cloud werden diese Variablen automatisch gesetzt.

# Projektstruktur
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

# Lizenz
MIT License