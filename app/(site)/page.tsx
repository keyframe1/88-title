import type { Metadata } from "next";
import Link from "next/link";
import { HomeHero } from "@/components/HomeHero";
import { ServiceIcon } from "@/components/ServiceIcon";
import { LiveQueue } from "@/components/checkin/LiveQueue";
import { ReturningBanner } from "@/components/checkin/ReturningBanner";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { pageMetadata } from "@/lib/seo";
import { getLocale, getUiText } from "@/lib/i18n/server";
import { getLocalizedPaths } from "@/lib/i18n/content/checklists";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, ui] = await Promise.all([getLocale(), getUiText()]);
  return pageMetadata({
    title: ui.meta.home.title,
    description: ui.meta.home.description,
    path: "/",
    absoluteTitle: true,
    locale,
  });
}

export default async function HomePage() {
  const [locale, ui] = await Promise.all([getLocale(), getUiText()]);
  const paths = getLocalizedPaths(locale);

  return (
    <>
      {/* Resume an active check-in — collapses to nothing when there's none. */}
      <ReturningBanner className="mx-auto max-w-6xl px-4 pt-6 sm:px-6" />

      {/* Hero */}
      <HomeHero />

      {/* Live queue — the differentiator. */}
      <section
        aria-labelledby="live-heading"
        className="mx-auto max-w-6xl px-4 pt-14 sm:px-6"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="live-heading" className="text-3xl font-extrabold">
              {ui.home.live.heading}
            </h2>
            <p className="mt-2 max-w-xl text-fog">{ui.home.live.subhead}</p>
          </div>
          <Link
            href="/lobby"
            className="hidden shrink-0 text-sm font-semibold text-ink transition-colors hover:text-plate sm:inline"
          >
            {ui.home.live.lobbyView}
          </Link>
        </div>
        <div className="mt-6">
          <InstallPrompt placement="home" />
        </div>
        <div className="mt-4">
          <LiveQueue variant="compact" />
        </div>
      </section>

      {/* Services grid */}
      <section
        aria-labelledby="services-heading"
        className="mx-auto max-w-6xl px-4 py-14 sm:px-6"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="services-heading" className="text-3xl font-extrabold">
              {ui.home.services.heading}
            </h2>
            <p className="mt-2 max-w-xl text-fog">{ui.home.services.subhead}</p>
          </div>
          <Link
            href="/services"
            className="hidden shrink-0 text-sm font-semibold text-ink transition-colors hover:text-plate sm:inline"
          >
            {ui.home.services.all}
          </Link>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paths.map((path) => (
            <li key={path.slug}>
              <Link
                href={`/services/${path.slug}`}
                className="service-card flex h-full flex-col rounded-2xl border border-line bg-paper p-5 transition duration-200 hover:border-ink hover:shadow-[0_16px_30px_-18px_rgba(20,33,61,0.5)] focus-visible:border-ink motion-safe:hover:-translate-y-1 motion-safe:focus-visible:-translate-y-1"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mist">
                  <ServiceIcon slug={path.slug} className="h-[26px] w-[26px]" />
                </span>
                <span className="mt-4 font-display text-lg font-extrabold text-ink">
                  {path.label}
                </span>
                <span className="mt-1.5 flex-1 text-sm leading-relaxed text-fog">
                  {path.blurb}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
