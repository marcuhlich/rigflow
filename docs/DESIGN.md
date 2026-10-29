# RigFlow Design System

Pro tool for event technicians. Calm, dense, precise: think Linear/Vercel
dashboard meets a flight-case label. Light and dark are equal citizens.

## Principles

1. **Flat surfaces, hairline borders.** No gradients, no glassmorphism, no glow,
   no coloured shadows, no `backdrop-blur` (except the sticky mobile top bar).
2. **One accent.** `primary` (signal amber by default, user-configurable) marks
   the single most important action and the active nav item. Don't paint
   whole areas with it.
3. **Neutral first.** Most UI is `foreground` / `muted-foreground` on
   `background` / `card`. Colour carries meaning only (status).
4. **Dense but breathable.** 13–14px UI text, 36px (`h-9`) controls, 32px rows
   in nav, tables with `px-3 py-2.5` cells.
5. **Technical values in mono.** Serial numbers, IDs, DMX addresses/universes,
   quantities in tables: `font-mono tabular-nums` (or the `.tech` class).
6. **Motion is functional.** ≤ 200ms, opacity/translate only. No bouncing,
   scaling on hover, pulsing, or staggered entrance animations.

## Tokens (see `src/index.css`)

| Token | Use |
|---|---|
| `background` | app canvas |
| `card` / `surface` | panels, list containers |
| `surface-sunken` | table headers, code, inset areas |
| `muted` / `muted-foreground` | secondary fills / secondary text |
| `border`, `border-strong` | hairlines / hover & emphasis |
| `primary` | primary action, active state, focus ring |
| `success` `warning` `info` `destructive` | status only |

Item status mapping: available → `success`, lent → `warning`,
in use → `info`, defect → `destructive`. Use `<StatusBadge>` or Badge
variants `available | lent | inUse | defect`.

Radius: `rounded-md` (6px) for controls, `rounded-lg` (8px) for panels.
Fonts: Geist (UI), Geist Mono (technical values).

## Building blocks

- `PageHeader` (`@/components/PageHeader`): every top-level page starts with it.
  Title, optional description, actions on the right. No icon in the title.
- `.surface` class or `<Card>`: bordered panel. Lists go inside a surface with
  `divide-y divide-border`.
- `.eyebrow`: small uppercase section label.
- `PageLoader`, `ListSkeleton`, `ErrorState`, `EmptyPanel`
  (`@/components/QueryState`): every data view handles loading, error
  (with retry) and empty explicitly.
- Buttons: `default` (primary, max one per view), `outline` (secondary),
  `ghost` (toolbar/icon), `destructive`. Sizes `sm` (32px), `default` (36px).
- Stats: plain number + label in a surface, no coloured icon bubbles.

## Don'ts

- `glass-card`, `glass-input`, `gradient-text`, `hover-lift`, `pulse-glow`:
  legacy, mapped to flat styles. Replace with `surface` / plain classes.
- `bg-gradient-*`, `from-*/to-*`, `shadow-primary/*`, `drop-shadow-[…]`,
  `backdrop-blur-*`, `animate-bounce`, `hover:scale-*`, emoji as icons.
- `text-accent` for meaning: `accent` is a neutral hover fill (shadcn semantics).
  Use `warning` / `primary` explicitly.
- Hardcoded strings: everything visible goes through i18n (`de` + `en`).
