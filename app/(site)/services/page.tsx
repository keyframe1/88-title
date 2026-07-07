import type { Metadata } from "next";
import { ServiceRow } from "@/components/ServiceRow";
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
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-plate">
        {ui.servicesIndex.eyebrow}
      </p>
      <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">
        {ui.servicesIndex.heading}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-fog">
        {ui.servicesIndex.intro}
      </p>

      <ul className="service-index mt-10">
        {paths.map((path, index) => (
          <li key={path.slug}>
            <ServiceRow path={path} index={index} />
          </li>
        ))}
      </ul>
    </div>
  );
}
