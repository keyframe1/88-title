import type { Metadata } from "next";
import { ServiceCards } from "@/components/services/ServiceCards";
import { pageMetadata } from "@/lib/seo";
import { getLocale, getUiText } from "@/lib/i18n/server";
import { getLocalizedPaths } from "@/lib/i18n/content/checklists";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, ui] = await Promise.all([getLocale(), getUiText()]);
  return pageMetadata({
    title: ui.meta.services.title,
    description: ui.meta.services.description,
    path: "/services",
    locale,
  });
}

export default async function ServicesPage() {
  const [locale, ui] = await Promise.all([getLocale(), getUiText()]);
  const paths = getLocalizedPaths(locale);

  return (
    <ServiceCards
      paths={paths}
      t={ui.servicesIndex}
      serviceLink={ui.home.hero.slideshow.serviceLink}
    />
  );
}
