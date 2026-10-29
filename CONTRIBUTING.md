# Contributing to RigFlow

Thanks for helping! A few things keep the codebase consistent.

## Workflow

1. Open an issue first for larger changes, so we can agree on the approach.
2. Fork, create a branch from `main`, keep pull requests focused.
3. Before pushing, run:

   ```bash
   npm run lint
   npx tsc --noEmit -p tsconfig.app.json
   python -I scripts/i18n-check.py
   npm run build
   ```

4. Describe what changed and why. For UI changes, add screenshots in light and dark mode.

## Conventions

- **UI**: follow [`docs/DESIGN.md`](docs/DESIGN.md). Use the shared building blocks
  (`PageHeader`, `QueryState`, `components/ui/*`) instead of one-off styles.
- **Text**: no hardcoded user-facing strings. Add keys to both
  `src/i18n/locales/de/translation.json` and `en/translation.json`. German uses the
  informal "du".
- **Data**: Supabase calls return `{ data, error }` and always check `error`.
  Inside TanStack Query functions, throw it. Every view handles loading, error
  (with retry) and empty states.
- **Dates**: use local dates for calendar values (`yyyy-MM-dd`). Don't use
  `new Date("yyyy-MM-dd")`, which is parsed as UTC.
- **Files**: split components that grow beyond ~400 lines into a feature folder.
- **Encoding**: files are UTF-8. On Windows, avoid PowerShell redirection (`>`) for
  generated files.

## License of contributions

By contributing you agree that your contributions are licensed under the
[AGPL-3.0](LICENSE), the license of this project.
