import type { Metadata } from "next";
import { HomeHero } from "@/components/HomeHero";
import { ServicesShowcase } from "@/components/services/ServicesShowcase";
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
  const locale = await getLocale();
  const paths = getLocalizedPaths(locale);
  // The hero slideshow needs only the localized label/blurb per service; pass it
  // from here (server) so the checklist-translation tables stay out of the client
  // bundle. The slideshow re-orders these into its own vignette order.
  const heroSlides = paths.map(({ slug, label, blurb }) => ({
    slug,
    label,
    blurb,
  }));
  // The showcase needs only the localized name per service; it re-orders these
  // into its own vignette order.
  const showcaseServices = paths.map(({ slug, label }) => ({ slug, label }));

  return (
    <>
      {/* Resume an active check-in — collapses to nothing when there's none. */}
      <ReturningBanner className="mx-auto max-w-6xl px-4 pt-6 sm:px-6" />

      {/* The hero owns live queue status (its status card is the single consumer
          of the shared subscription), so no separate "line right now" section. */}
      <LiveQueueProvider>
        <HomeHero slides={heroSlides} />
      </LiveQueueProvider>

      {/* Services showcase — the animated vignette grid on the darker paper band.
          All seven transactions are tiles here (Services also lives in the header
          + footer nav). */}
      <ServicesShowcase services={showcaseServices} />
    </>
  );
}
