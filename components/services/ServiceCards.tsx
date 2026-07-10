import Link from "next/link";
import type { LocalizedTransactionPath } from "@/lib/i18n/content/checklists";
import type { UiDictionary } from "@/lib/i18n/ui";
import { ServiceVignette, type VignetteSlug } from "./vignettes";

/**
 * /services card grid — ported from the approved Claude Design export
 * ("88 Title Services.dc.html"). A floating white panel holds six uniform
 * utility cards (icon, name, one-line description, hairline, item-count chip)
 * plus the wide Notary walk-in anchor.
 *
 * This is a server component: the shared vignettes render statically, hover /
 * focus is pure CSS (see `.svc-cards` in globals.css), and the item-count chip
 * is wired to REAL data — each service's checklist length from lib/checklists,
 * localized. A service with no checklist simply omits the chip (never an
 * invented number). The chip is the card's single utility marker and its one
 * footer element: on hover / focus it tints plate red alongside the title, so
 * the count is the cue — there is no separate "what to bring" link text. The
 * whole card is the link; each carries the hero's shared "[Service], see what
 * to bring" aria-label so it is never named by icon alone. The card
 * descriptions reuse the already-localized checklist blurbs, so the copy stays
 * a single source across the site.
 */

/** Card order from the export (the checklist source order differs). */
const CARD_ORDER: readonly VignetteSlug[] = [
  "registration-renewal",
  "title-transfer",
  "plates",
  "new-to-louisiana",
  "duplicate-title",
  "inherited-vehicle",
] as const;

export function ServiceCards({
  paths,
  t,
  serviceLink,
}: {
  paths: LocalizedTransactionPath[];
  t: UiDictionary["servicesIndex"];
  /** Localized "[Service], see what to bring" accessible name (shared with the
      hero slideshow). */
  serviceLink: (label: string) => string;
}) {
  const bySlug = new Map(paths.map((p) => [p.slug, p]));
  const cards = CARD_ORDER.map((slug) => bySlug.get(slug)).filter(
    (p): p is LocalizedTransactionPath => Boolean(p),
  );
  const notary = bySlug.get("notary");

  const hint = (count: number) => (count > 0 ? t.itemsToBring(count) : null);

  return (
    <section className="svc-cards">
      <div className="svc-cards__reveal">
        <div className="svc-cards__panel">
          <header className="svc-cards__header">
            <p className="svc-cards__eyebrow">{t.eyebrow}</p>
            <h1 className="svc-cards__heading">{t.heading}</h1>
            <p className="svc-cards__intro">{t.intro}</p>
          </header>

          <div className="svc-cards__grid">
            {cards.map((card) => {
              const count = hint(card.items.length);
              return (
                <Link
                  key={card.slug}
                  href={`/services/${card.slug}`}
                  aria-label={serviceLink(card.label)}
                  className="svc-card"
                >
                  <span className="svc-card__icon">
                    <ServiceVignette slug={card.slug as VignetteSlug} size="card" />
                  </span>
                  <h2 className="svc-card__title">{card.label}</h2>
                  <p className="svc-card__desc">{card.blurb}</p>
                  <span className="svc-card__spacer" />
                  {count ? (
                    <>
                      <span className="svc-card__rule" />
                      <span className="svc-card__count">{count}</span>
                    </>
                  ) : null}
                </Link>
              );
            })}
          </div>

          {notary ? (
            <Link
              href="/services/notary"
              aria-label={serviceLink(notary.label)}
              className="svc-card svc-card--notary"
            >
              {/* Quiet engraved seal watermark (decorative). */}
              <svg
                className="svc-card__notary-seal"
                width={150}
                height={150}
                viewBox="0 0 200 200"
                aria-hidden="true"
              >
                <circle cx={100} cy={100} r={86} fill="none" stroke="var(--color-plate)" strokeWidth={5} />
                <circle cx={100} cy={100} r={70} fill="none" stroke="var(--color-plate)" strokeWidth={9} strokeDasharray="2 11" />
                <circle cx={100} cy={100} r={40} fill="none" stroke="var(--color-plate)" strokeWidth={4} />
                <circle cx={100} cy={100} r={10} fill="var(--color-plate)" />
              </svg>

              <span className="svc-card__notary-inner">
                <span className="svc-card__notary-icon">
                  <ServiceVignette slug="notary" size="card" />
                </span>
                <span className="svc-card__notary-body">
                  <span className="svc-card__notary-titlerow">
                    <h2 className="svc-card__title">{notary.label}</h2>
                    <span className="svc-card__chip">{t.walkIn}</span>
                  </span>
                  <p className="svc-card__desc svc-card__desc--notary">{notary.blurb}</p>
                </span>
                <span className="svc-card__notary-right">
                  <span className="svc-card__count">{hint(notary.items.length)}</span>
                </span>
              </span>
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
