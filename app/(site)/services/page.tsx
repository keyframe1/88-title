import type { Metadata } from "next";
import Link from "next/link";
import { ServiceIcon } from "@/components/ServiceIcon";
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
        {ui.servicesIndex.introBefore}
        <Link
          href="/checklist"
          className="font-semibold text-ink underline-offset-2 hover:text-plate hover:underline"
        >
          {ui.servicesIndex.introLink}
        </Link>
        {ui.servicesIndex.introAfter}
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
}
