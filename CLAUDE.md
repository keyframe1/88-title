@AGENTS.md

# 88 Title — project guide

Website for **88 Title**, a Louisiana public tag agency in Metairie: an online
check-in queue (later), customer self-service tools, and a dealer portal (later).

## Stack

Next.js 16 App Router (React 19) · TypeScript **strict** (no `any`, no
`eslint-disable`) · Tailwind CSS v4 (brand tokens as CSS variables) · Supabase
(auth + Postgres + realtime) · Stripe + Resend (later) · Vercel. Server
Components by default; Server Actions for mutations.

> Next 16 differs from older Next.js — see `AGENTS.md` and read
> `node_modules/next/dist/docs/` before writing app code. Notably: `params` and
> `searchParams` are **Promises** (await them); `cookies()` is **async**.

## Non-negotiable: compliance-safe pricing

- The **$23 public tag fee is statutory**. Always render it as its own discrete,
  **locked** line item, shown as exactly `$23`, **never merged** into another
  amount, and **always** with the OMV disclosure (`OMV_DISCLOSURE` in
  `lib/services.ts`): a customer may obtain the tag at the OMV without paying
  88 Title's convenience charge.
- **No personalized totals. No state-tax estimates.** This site displays menu
  prices only. `lib/services.ts` intentionally exports **no** total-calculating
  function — do not add one.
- Service prices are **placeholders** (`unconfirmed: true`) pending Chris's
  confirmation; they render with a "sample pricing, confirm in office" caveat.
  The $23 fee is the deliberate exception (statutory + fixed, not `unconfirmed`).

## Brand ("Look 1 / Counter")

Paper white · ink navy `#14213D` · plate red `#C8102E`. Display font **Archivo**
(700/800), body **Inter**. Buttons use ONE flat system in `app/globals.css`
(`.btn` + `.btn--primary` / `--secondary` / `--ghost` / `--danger`, sizes
`--sm` / `--lg`): PRIMARY is solid plate-red with a tracked-caps plate label (the
one loud action, also wrapped by `components/PlateButton.tsx`); the quieter
variants are sentence-case. Form controls share the `field` / `select-field` /
`date-field` input family (soft focus ring, drawn select chevron). Empty states
use `components/EmptyState.tsx` (composed 88 mark + headline + one action, never a
dashed box). Mobile-first at 375px. Honor `prefers-reduced-motion`, use real HTML
text for headings, and keep fixed aspect ratios (no layout shift). Tokens live in
`app/globals.css` (`@theme`).

## Data sources

- `lib/services.ts` — pricing menu line items (a display, not a calculator).
- `lib/checklists.ts` — transaction "what to bring" config; drives the
  DocumentFinder, the homepage grid, and `/services/[slug]`.
- `lib/site.ts` — shared business facts (address/phone/hours/visit time are
  placeholders to confirm).
- `lib/supabase/{server,client}.ts` — Supabase factories (not called yet).

## Do NOT build yet (later phases)

The check-in queue backend, dealer-portal auth, Stripe charging, and any tax or
total estimation.

## Workflow

Run `npm run build` **and** `npm run lint` before committing — both must be
**zero errors, zero warnings**. Never commit `.env.local` or any secret.
