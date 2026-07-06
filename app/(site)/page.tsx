import type { Metadata } from "next";
import Link from "next/link";
import { HomeHero } from "@/components/HomeHero";
import { ServiceCard } from "@/components/ServiceCard";
import { LiveQueueProvider } from "@/components/checkin/LiveQueueProvider";
import { ReturningBanner } from "@/components/checkin/ReturningBanner";
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

      {/* The hero owns live queue status (its status card is the single consumer
          of the shared subscription), so no separate "line right now" section. */}
      <LiveQueueProvider>
        <HomeHero />
      </LiveQueueProvider>

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
              <ServiceCard path={path} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
