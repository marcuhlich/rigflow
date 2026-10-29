<p align="center">
  <img src="assets/brand/rigflow-mark.svg" width="72" height="72" alt="RigFlow logo" />
</p>

<h1 align="center">RigFlow</h1>

<p align="center">
  Inventory, lending, projects and DMX patch planning for event technicians.<br />
  Web app, installable PWA and Android app.
</p>

<p align="center">
  <a href="https://rigflow.net">rigflow.net</a> ·
  <a href="#getting-started">Getting started</a> ·
  <a href="CONTRIBUTING.md">Contributing</a> ·
  <a href="LICENSE">AGPL-3.0</a>
</p>

---

RigFlow helps crews keep track of their gear: what they own, where it is, who
borrowed it, what goes into which show, and how the lighting rig is patched.
It works offline at the venue, scans QR labels with the phone camera and is
available in German and English.

## Features

- **Inventory**: items with categories, per-category attributes, tags,
  quantities, locations, photos, value and condition; trash with restore.
- **QR labels**: generate and print labels, then scan them in the app to look up,
  check out or return gear.
- **Projects & packing lists**: plan shows, add reusable packages, tick items
  off while packing, record returns (OK / damaged / missing) and archive.
- **Lending**: who has what until when, with overdue reminders.
- **DMX patch plan**: universes and addresses per fixture instance,
  console-style channel grid, conflict detection, CSV export.
- **Maintenance**: service intervals and a maintenance log per item.
- **Dashboard**: what needs attention, upcoming projects, recent activity.
- **Offline first**: local cache and an offline queue that syncs when the
  connection is back.
- **Account security**: 2FA (TOTP) with recovery codes, data export,
  account deletion.
- Command palette (<kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd>), undo/redo,
  light/dark theme, accent colours.

### Try it

Open [rigflow.net](https://rigflow.net) and sign in with the demo account
`demo@rigflow.app` / `demo1234`. Some features are limited in the demo.

## Tech stack

| Area | Used |
|---|---|
| Frontend | React 18, TypeScript, Vite, React Router 6 |
| UI | Tailwind CSS, shadcn/ui (Radix UI), lucide icons, Geist font |
| Data | Supabase (Postgres, Auth, Storage, Edge Functions), TanStack Query |
| Mobile | Capacitor 8 (Android), PWA via `vite-plugin-pwa` |
| i18n | i18next (`de`, `en`) |
| Analytics | PostHog (opt-in only), Vercel Analytics |

## Getting started

### Requirements

- Node.js 20+ (or Bun)
- A [Supabase](https://supabase.com) project
- For Android: JDK 21 and the Android SDK

### Run locally

```bash
git clone https://github.com/marcuhlich/rigflow.git
cd rigflow
npm install            # or: bun install
cp .env.example .env   # then fill in your Supabase URL and publishable key
npm run dev
```

The app runs at <http://localhost:8080> (see `vite.config.ts`).

### Environment variables

All `VITE_*` variables are bundled into the frontend and are therefore public.
Never put a service role key into `.env`.

| Variable | Required | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | yes | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | yes | Supabase anon / publishable key |
| `VITE_GOOGLE_CLIENT_ID` | no | Google Sheets export |
| `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` | no | Analytics (loaded only after consent) |

### Supabase

1. Create a project and link the CLI: `npx supabase link --project-ref <ref>`.
2. Apply the database schema: `npx supabase db push`. This runs the baseline
   (`supabase/migrations/20261029115900_baseline_schema.sql`, a full schema dump)
   and every migration after it.
3. Deploy the edge functions: `npx supabase functions deploy`.
4. Set function secrets (`npx supabase secrets set NAME=value`):

| Secret | Used by |
|---|---|
| `SETUP_DEMO_SECRET` | `setup-demo` – (re)creates the demo account; call it with header `x-setup-secret` |
| `GITHUB_TOKEN` | `latestRelease` – optional, raises the GitHub API rate limit |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are
provided to edge functions automatically.

New schema changes go into a new file in `supabase/migrations/`. The old,
incomplete migrations are kept in `supabase/migrations_archive/` for reference only.

After schema changes, regenerate the types:

```bash
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

> On Windows, don't use PowerShell's `>`. It writes UTF-16 and breaks
> umlauts. Use Git Bash or `cmd /c`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build into `dist/` |
| `npm run lint` | ESLint |
| `npx tsc --noEmit -p tsconfig.app.json` | Type check |
| `npm run build:android` | Web build for Capacitor + `cap sync` |
| `python -I scripts/i18n-check.py` | Reports `t("…")` keys missing in `de`/`en` |
| `python -I scripts/i18n-merge.py` | Merges new keys from `scripts/i18n-pending/*.json` |
| `python -I scripts/build-icons.py` | Renders all favicons, PWA, Android and splash images from `assets/brand/*.svg` (needs Chrome or Edge) |

## Android

```bash
npm run build:android                   # web build + cap sync
npx capacitor-assets generate --android # app icons & splash from assets/
cd android
./gradlew assembleDebug                 # or assembleRelease / bundleRelease
```

- The `android/` folder is generated and not versioned. Run `npx cap add android`
  on a fresh clone, then copy `assets/brand/native/ic_stat_rigflow.xml` to
  `android/app/src/main/res/drawable/` (status bar notification icon).
- Debug builds can use the application ID suffix `.dev` ("RigFlow Dev"), so they
  install next to the Play Store version. The Play Store version is signed by Google
  (Play App Signing) and can't be overwritten by a local build.
- Release signing: keep keystore credentials out of `build.gradle`, for
  example in an untracked `keystore.properties`.

## Project structure

```
src/
  components/      feature components (inventory/, item-form/, project-detail/, dmx/, scanner/, settings/, …)
  components/ui/   shadcn/ui primitives
  components/layout/ app shell (sidebar, tab bar), settings layout, logo
  hooks/           data hooks (Supabase + TanStack Query)
  lib/             utilities: offline queue, DMX, export/print, push, logger
  pages/           route components
  i18n/            i18next setup and de/en translations
supabase/
  functions/       edge functions (Deno)
  migrations/      SQL migrations
assets/brand/      logo source (SVG), used to generate all icons
docs/DESIGN.md     design system rules
scripts/           i18n and icon tooling
```

## Design

The UI follows a small design system: neutral graphite surfaces, hairline borders,
one signal accent, mono type for technical values. See
[`docs/DESIGN.md`](docs/DESIGN.md) before adding UI.

## Self-hosting a fork

The legal pages in `public/` (`impressum.md`, `datenschutz.md`, `privacy.md`,
`Nutzungsbedingungen.md`, `terms-of-use.md`, `legal-notice.md`) belong to the
operator of rigflow.net. Replace them with your own before running a public
instance. The RigFlow name and logo identify the official project, so please
use your own branding for a public fork.

## Contributing

Issues and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md).
To report a security issue, follow [SECURITY.md](SECURITY.md). Please don't
open a public issue for it.

## License

RigFlow is licensed under the [GNU Affero General Public License v3.0](LICENSE).
If you run a modified version as a network service, you must make your source
code available to its users.
