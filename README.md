# 88 Title

Website for **88 Title**, a Louisiana public tag agency in Metairie. It pairs an
(upcoming) online check-in queue with customer self-service tools and a (later)
dealer portal — so customers skip the OMV line and keep their afternoon.

This repository is currently at the **foundation** phase. See
[Project status](#project-status) for what is and isn't built yet.

## Stack

- **Next.js 16** (App Router, React 19) — Server Components by default, Server
  Actions for mutations
- **TypeScript** in strict mode (no `any`, no `eslint-disable`)
- **Tailwind CSS v4** with brand tokens defined as CSS variables
- **Supabase** (auth + Postgres + realtime) — client setup only so far
- **Stripe** and **Resend** — reserved for later phases (not yet integrated)
- Deployed on **Vercel**

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then fill in real values
npm run dev                        # http://localhost:3000
```

Other scripts:

```bash
npm run build   # production build (also runs TypeScript checks)
npm run lint    # ESLint — must be warning-free
```

## Project structure

```
app/
  layout.tsx              Root layout: fonts, metadata, header/footer
  page.tsx                Homepage (Counter look)
  checklist/              "What to bring" — the DocumentFinder tool
  pricing/                Itemized service menu (display only)
  check-in/               Online check-in (stub; queue lands next phase)
  services/               Services index + per-transaction pages
components/
  PlateButton.tsx         License-plate styled primary CTA
  PlateGraphic.tsx        Decorative Louisiana plate (hero)
  DocumentFinder.tsx      Multi-step what-to-bring checklist (client)
  SiteHeader/SiteFooter   Chrome (footer carries the OMV disclosure)
  dealers/                Dealer portal: login, dashboard, password reset
lib/
  services.ts             Service line items (display data; NO total function)
  checklists.ts           Transaction "what to bring" config
  site.ts                 Shared business facts (some placeholders)
  dealers/                Portal types, data-access layer, server actions
  email/                  Resend sender + dealer notification templates
  supabase/               Server + browser Supabase clients (+ Database types)
proxy.ts                  Next 16 proxy: protects /dealers/* (renamed middleware)
scripts/
  create-dealer.mjs       Provision a dealer/staff login (service key, local only)
supabase/
  migrations/             SQL migrations (init + dealer portal: tables, RLS)
docs/
  dealer-portal.md        Isolation model, provisioning, route + email behavior
```

## Compliance-safe pricing

The **$23 public tag fee is statutory**. It must always render as its own
discrete, locked line item, shown as exactly `$23`, never merged into another
amount, and always accompanied by the disclosure that a customer may obtain the
tag at the OMV without paying 88 Title's convenience charge.

All other services are 88 Title's own menu, itemized separately. **No tool on
this site computes a personalized total or estimates state tax** — `lib/services.ts`
deliberately exports no total-calculating function. Menu prices are displayed
only.

> ⚠️ Service prices are **placeholders** (sampled from a nearby notary) pending
> Chris's confirmation, and render with a "sample pricing, confirm in office"
> caveat. The $23 statutory fee is the exception — it is fixed and exact.

## Project status

**Built (foundation):** brand system, homepage, DocumentFinder, pricing display,
visit-time expectations, per-transaction pages, Supabase client setup, and the
**dealer portal foundation** — invite-only auth, dealer accounts, RLS-enforced
data isolation, a working dashboard (transaction list + intake), and the Resend
notification hook. See [docs/dealer-portal.md](docs/dealer-portal.md).

**Not built yet (later phases):** the check-in queue backend, the staff-facing
dealer dashboard UI, Stripe charging, and any tax or total estimation.
