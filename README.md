# 🎬 RigFlow - Professionelle Inventarverwaltung für Veranstaltungstechnik

**RigFlow** ist eine moderne, progressive Web-App zur Verwaltung von Event-Equipment. Mit intelligenter QR-Code-Integration, DMX-Patchplanung, Verleihverwaltung und Event-Sets – optimiert für kleine bis mittelgroße Technik-Sammlungen.

Nutze RigFlow im Browser, als installierbare PWA auf Smartphone/Tablet oder als Desktop-App für Windows.

[![Live Demo](https://img.shields.io/badge/Live-rigflow--web.vercel.app-blue?style=flat-square)](https://rigflow.net)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS 3](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![PWA](https://img.shields.io/badge/PWA-Ready-purple?style=flat-square)](https://web.dev/progressive-web-apps/)

---

## 📖 Was ist RigFlow?

**RigFlow** ist eine spezialisierte Verwaltungssoftware für Veranstaltungstechniker, Künstler und Event-Manager. Die App wurde konzipiert für:

- 🎬 **Veranstaltungstechniker** – Verwaltung von Lichttechnik, Sound, Bühnentechnik
- 🎪 **Künstler & Events** – Equipment für Touren, Festivals, Theater-Produktionen
- 🏢 **Vermiet-Unternehmen** – Tracking von vermietetem Material
- 🔌 **Techniker-Teams** – Gemeinsame Verwaltung von Geräte-Pooling

Mit RigFlow kannst du:
- ✅ **Inventar im Blick** – Jedes Gerät katalogisieren und tracken
- ✅ **Schnell finden** – QR-Code Scanner für sofortiges Equipment-Lookup
- ✅ **Verteilung planen** – DMX-Addressen, Rack-Layout, Packlisten
- ✅ **Verleih managen** – Wer hat was, bis wann, wann kommt's zurück?
- ✅ **Offline arbeiten** – PWA lädt alle Daten lokal für Festivals ohne WLAN
- ✅ **Schnelle Reports** – PDF-Exports, Statistiken, Wartungsverlauf

---

## ✨ Screenshots

> **Hinweis:** Screenshots sind Platzhalter. Besuche die Live-Demo unter https://rigflow.net um die echte App zu sehen.

| Dashboard | Inventar | DMX Patchplan |
|-----------|----------|---------------|
| Übersicht & Statistiken | QR-Scanner & Verwaltung | Addressplanung |
| [Hier könnte Screenshot sein] | [Hier könnte Screenshot sein] | [Hier könnte Screenshot sein] |

---

## 🚀 Schnellstart – Demo

Teste die App kostenlos mit Demo-Account:

1. **Öffne** https://rigflow.net
2. **Melde dich an** mit:
   - E-Mail: `demo@rigflow.app`
   - Passwort: `demo1234`

> **Hinweis:** Der Demo-Account dient zum Austesten. Viele Funktionen sind eingeschränkt verfügbar. Für volle Funktionalität: Registriere deinen kostenlosen Account.

---

## 🎯 Features

### 🏢 Inventarverwaltung
- Unbegrenzte Geräte-Katalogisierung
- Kategorien, Unterkategorien, Tags
- Zustandserfassung (funktionsfähig, Wartung, Defekt)
- Standorttracking
- Stückpreis & Kalkulationswert
- Notizen & Anhänge

### 📱 QR-Code System
- **Auto-Generierung** – Für jedes Gerät automatisch
- **Scanner-App** – Integrierte Kamera-Integration
- **Etikett-Druck** – Druckbare QR-Code-Bögen
- **Massenexport** – Bulk-Download aller QR-Codes
- **Individuelle QR** – Benutzerdefinierte Größen & Rahmen

### 🔌 DMX-Patchplanung
- Fixture-Type definieren (Spot, PAR, Scanner, etc.)
- Addressen automatisch zuweisen
- Konflikt-Erkennung (Adresse bereits belegt?)
- Timeline-Visualisierung
- Rack-Layout
- Export zu Dateimanager, Digico, Behringer

### 📋 Event-Checklisten
- Vor-Event Checklisten
- Nach-Event Checklisten
- Zuordnung zu Event-Sets
- Abhaken mit Zeitstempel
- Verantwortliche pro Item

### 🎬 Event-Sets / Packlisten
- Event-Sets mit Artikeln
- Verfügbarkeitsprüfung
- Ausgecheckt/Eingecheckt Tracking
- PDF-Export als Packliste
- Checklisten integrieren

### 🤝 Verleihverwaltung
- Wer hat was? (Checkout/Checkin)
- Fälligkeitsdaten
- Rückgabe-Tracking
- Überfällige Benachrichtigungen
- Verleih-Historie
- Kontakt-Info des Ausleiher

### 📊 Dashboard
- Statistiken (Geräte, Ausleihen, Wert)
- Aktive Ausleihen (Was ist unterwegs?)
- Wartungsverlauf
- Letzte Aktivitäten & Audit-Log
- Schnelle Aktionen

### 📤 Export & Berichte
- **CSV-Export** – Für Excel, Google Sheets
- **PDF-Export** – Inventar, Packlisten, Patchpläne
- **Druckansicht** – Optimiert für Papier
- **Datenexport** – GDPR-konform (Deine Daten, Dein Format)

### 🔔 Intelligente Benachrichtigungen
- Überfällige Rückgaben
- Wartungserinnerungen
- Bestände-Warnungen
- Konflikt-Alerts

### 🔐 Authentifizierung & Benutzer
- E-Mail & Passwort Login
- E-Mail-Verifizierung
- Passwort-Reset
- Optional: Social Login (Google, GitHub)

### 📝 Audit-Log
- Alle Änderungen protokolliert
- Wer hat was wann geändert?
- Vollständige Historie
- Abfragbar & exportierbar

### 🟦 Undo/Redo
- Schnelle Rückgängigmachung
- Redo um rückgängig gemachte Aktionen wiederherzustellen
- Nur für Inventory-Items

### 🌙 Dark Mode
- Augen-freundlich
- Schont Batterie (bei OLED)
- Automatische Umschaltung (wenn systemweit aktiviert)

### ✅ Weitere Features
- **Offline-Funktion** – PWA lädt Daten lokal
- **Real-time Sync** – Alle Änderungen aktuell
- **Responsive** – Desktop, Tablet, Mobile
- **Schnell** – Optimiert mit Vite & React Query
- **Open Source** – GitHub Repo verfügbar (MIT License)

---

## 💻 Installation & Verwendung

### 1. 🌐 Browser (Empfohlen - Einfachste Methode)

Die einfachste Variante – keine Installation erforderlich.

👉 **RigFlow öffnen:** https://rigflow.net

Einfach anmelden und starten. Alle Daten synchronisieren automatisch.

### 2. 📱 Mobile App (PWA - App-ähnliche Erfahrung)

RigFlow kann wie eine native App installiert werden – mit offline-Unterstützung.

#### Android Installation
1. **Öffne Chrome** (oder Edge, Brave)
2. **Gehe zu** https://rigflow.net
3. **Menü öffnen** ⋮ → **"Zum Startbildschirm hinzufügen"**
4. App erscheint auf dem Home-Screen
5. **Laden starten** – PWA wird installiert

#### iOS Installation
1. **Öffne Safari**
2. **Gehe zu** https://rigflow.net
3. **Teilen-Button** drücken
4. **"Zum Home-Bildschirm"** auswählen
5. App ist installiert und offline-verfügbar

**Offline-Features (PWA):**
- Alle Daten lokal gespeichert
- Funktioniert ohne Internet
- Automatische Synchronisation sobald Verbindung verfügbar

### 3. 🪟 Windows Desktop App

Native Desktop-Erfahrung für Windows.

📥 **Download:** https://github.com/marcuhlich/rigflow-desktop

**Installation:**
1. Release herunterladen (.exe Installer)
2. Setup ausführen
3. RigFlow starten (Desktop-Shortcut erstellt)

**Features (Desktop):**
- Native Windows Integration
- Schnellerer Zugriff
- Offline-Funktionalität
- System-Tray Support

---

## 🛠 Tech Stack

### Frontend Framework
- **React 18** – Modern UI Framework
- **TypeScript 5** – Type Safety & DX
- **Vite** – Next-Gen Build Tool (Lightning Fast)
- **React Router v6** – Routing

### UI & Styling
- **Tailwind CSS 3** – Utility-first CSS
- **shadcn/ui** – Accessibility-First Components
- **Lucide Icons** – Beautiful Icon Library
- **Radix UI** – Headless Components (unter shadcn)

### State Management & Data
- **TanStack React Query (v5)** – Server State & Caching
- **Zustand** – Client-Side State
- **Supabse Real-time** – Live Subscriptions

### Backend & Database
- **Supabase** – PostgreSQL Database
  - Authentication (Email, Magic Links)
  - Real-time Database
  - File Storage (für QR-Codes, Bilder)
  - Edge Functions (serverless Funktionen)

### Utilities & Libraries
- **jsPDF + AutoTable** – PDF Generation
- **jsQR** – QR-Code Scanner
- **api.qrserver.com** – QR-Code Generator
- **jsbarcode** – Barcode Generation
- **date-fns** – Date Handling
- **zod** – TypeScript-first Schema Validation
- **React Hook Form** – Form Management

### PWA & Offline
- **vite-plugin-pwa** – PWA Support
- **Service Worker** – Offline Caching
- **IndexedDB** – Local Data Storage

### Build & Quality
- **Vite** – Ultra-fast builds
- **PostCSS** – CSS Processing
- **ESLint** – Code Linting
- **TypeScript** – Static Type Checking
- **Prettier** – Code Formatting

### Deployment & Infrastructure
- **Vercel** – Hosting (PWA)
- **GitHub** – Source Code & Versioning
- **Supabase Cloud** – Database Hosting

### Mobile & Desktop
- **Capacitor** – Android Build Tool
- **Electron** – Windows Desktop (rigflow-desktop Repo)

---

## 🚀 Lokale Entwicklung Setup

### Voraussetzungen
- **Node.js** >= 18 (oder Bun)
- **Git**
- **Supabase Account** (für Backend, siehe [Supabase Setup](#-supabase-setup))

### 1. Repository klonen

```bash
git clone https://github.com/marcuhlich/rigflow.git
cd rigflow
```

### 2. Abhängigkeiten installieren

Mit **npm:**
```bash
npm install
```

Oder mit **Bun** (schneller):
```bash
bun install
```

### 3. Umgebungsvariablen konfigurieren

Erstelle eine `.env.local` Datei im Root-Verzeichnis:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your-anon-key
```

[Siehe Supabase Setup → Credentials kopieren](#-supabase-setup)

### 4. Development Server starten

```bash
npm run dev
```

oder mit Bun:
```bash
bun run dev
```

App läuft unter: **http://localhost:8080**

### 5. Build für Production

```bash
npm run build
```

Generiert optimierte Build in `dist/` Verzeichnis.

### 6. Preview Production Build

```bash
npm run preview
```

---

## 🔐 Supabase Setup

RigFlow benötigt ein Supabase-Projekt für Authentifizierung, Datenbank und Speicher.

### Schritt 1: Supabase Projekt erstellen

1. Gehe zu https://app.supabase.com
2. Registriere dich (kostenlos)
3. **Neues Projekt erstellen**:
   - Name: `rigflow` (oder beliebig)
   - Password: Sicher speichern!
   - Region: Wähle Region nächst zu dir
4. Warte auf Projekt-Initialisierung (~2 Min)

### Schritt 2: Credentials kopieren

1. **Project Settings** öffnen
2. **API** im Menü
3. Kopiere:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` Key → `VITE_SUPABASE_KEY`

### Schritt 3: Datenbank-Schema migrieren

Das Schema wird automatisch beim ersten App-Start erstellt, ODER manuell:

```bash
# Terminal im rigflow Verzeichnis:
supabase db push
```

Falls Supabase CLI nicht installiert:
```bash
npm install -g supabase
```

### Schritt 4: Storage Buckets erstellen (für QR-Codes)

1. Supabase Dashboard → **Storage**
2. **Neuen Bucket erstellen**:
   - Name: `qr-codes`
   - Public: ✅ (damit QR-Codes öffentlich zugänglich sind)
3. Repeat für: `images`, `exports`

### Schritt 5: Auth konfigurieren

1. **Authentication** → **Providers**
2. **Email** aktivieren (sollte standardmäßig an sein)
3. Ggf. **Google** oder **GitHub** als OAuth-Anbieter hinzufügen

### Local Supabase (Optional)

Für lokale Entwicklung ohne Internet:

```bash
# Supabase Local Development
supabase start
```

Setzt lokale Supabase mit Docker auf. Siehe [Supabase Local Dev Docs](https://supabase.com/docs/guides/local-development).

---

## 🏗️ Build Instructions

### 📱 PWA (Progressive Web App) - Browser & Mobile

Die Standard-Build für Web-Deployment auf Vercel oder eigener Hosting.

#### Build für Production

```bash
npm run build
```

Generiert `dist/` Verzeichnis mit:
- ✅ PWA manifest
- ✅ Service Worker
- ✅ Optimierter JavaScript/CSS
- ✅ Offline-fähig

#### Deploy zu Vercel

1. Push zu GitHub
2. Vercel verbinden (Auto-Deploy)
3. oder manuell:

```bash
npm install -g vercel
vercel
```

#### Deploy zu eigenem Server

```bash
npm run build
# Upload dist/ Verzeichnis zu deinem Server
# z.B. mit SFTP, FTP oder Git Push
```

**Hinweis:** RigFlow benötigt HTTPS für PWA. HTTP funktioniert nur lokal.

---

### 🪟 Electron Desktop App (Windows)

Separate Repository für Desktop-Build: https://github.com/marcuhlich/rigflow-desktop

#### Setup Electron (im rigflow-desktop Repo)

```bash
git clone https://github.com/marcuhlich/rigflow-desktop.git
cd rigflow-desktop
npm install
```

#### Development mit Electron

```bash
npm run dev
```

Startet Electron mit Hot-Reload.

#### Build für Distribution

```bash
npm run build
```

Generiert `.exe` Installer für Windows unter `dist/`.

---

### 🤖 Android App (APK / AAB)

RigFlow kann als native Android-App gebuildet werden mit **Capacitor**.

#### Voraussetzungen
- Java SDK >= 11
- Android Studio (oder Android SDK)
- Gradle

#### Setup

```bash
# Capacitor installieren
npm install @capacitor/core @capacitor/cli
npx cap init rigflow com.rigflow.app

# Android-Projekt erstellen
npx cap add android

# Credentials in capacitor.config.ts eintragen
```

#### Build APK

```bash
# Web-Build aktualisieren + Sync zu Android Projekt
npm run build:android


# APK bauen
cd android
./gradlew assembleDebug

# APK ist dann unter: android/app/build/outputs/apk/debug/
```

#### Preview in Android Studio
1. Android Studio installieren und starten
2. Projekt-Ordner öffnen, warten bis importiert
3. Über den grünen Playbutton Preview starten
4. Entweder auf virtuellem Gerät anzeigen, oder App auf echtem Gerät über USB-Debugging anzeigen (empfohlen)

#### Build App Bundle (für Google Play)

```bash
./gradlew bundleRelease
# Bundle ist unter: android/app/build/outputs/bundle/release/
```

#### Installation auf Gerät

```bash
# Falls ADB installiert:
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📁 Projektstruktur

```
rigflow/
├── src/
│   ├── App.tsx                 # Root Component
│   ├── main.tsx               # Entry Point
│   ├── index.css              # Global Styles
│   │
│   ├── components/            # React Components
│   │   ├── ui/                # shadcn/ui Components
│   │   ├── layout/            # Layout Components (Sidebar, Nav)
│   │   ├── DashboardPanel.tsx
│   │   ├── InventoryGrid.tsx
│   │   ├── DMXPatchplan.tsx
│   │   └── ...
│   │
│   ├── pages/                 # Page Components
│   │   ├── Dashboard.tsx
│   │   ├── Inventory.tsx
│   │   ├── ItemDetail.tsx
│   │   ├── DMXPatchplan.tsx
│   │   ├── Projects.tsx
│   │   ├── Lending.tsx
│   │   └── Auth.tsx
│   │
│   ├── hooks/                 # Custom React Hooks
│   │   ├── useAuth.ts
│   │   ├── useInventory.ts
│   │   ├── useDMXPatchplan.ts
│   │   └── ...
│   │
│   ├── contexts/              # React Context
│   │   └── UndoRedoContext.tsx
│   │
│   ├── lib/                   # Utilities & Helpers
│   │   ├── qr-generator.ts
│   │   ├── pdf-export.ts
│   │   └── ...
│   │
│   ├── types/                 # TypeScript Types
│   │   ├── index.ts
│   │   └── supabase.ts
│   │
│   └── integrations/          # External Services
│       └── supabase/          # Supabase Client
│
├── public/                    # Static Assets
│   ├── manifest.webmanifest
│   └── sw.js                 # Service Worker
│
├── android/                   # Capacitor Android Project
├── supabase/                  # Supabase Migrations & Functions
│
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

---

## 🤝 Beitragen

Beiträge sind willkommen! 

1. **Fork** das Repo
2. **Feature Branch** erstellen (`git checkout -b feature/amazing-feature`)
3. **Commits** (`git commit -m 'Add amazing feature'`)
4. **Push** (`git push origin feature/amazing-feature`)
5. **Pull Request** öffnen

Siehe [CONTRIBUTING.md](CONTRIBUTING.md) für Details.


**RigFlow** – Mach Dein Equipment-Management einfach! 🎬✨
