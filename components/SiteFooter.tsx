import Link from "next/link";
import { SITE } from "@/lib/site";
import { OMV_DISCLOSURE } from "@/lib/services";

const FOOTER_LINKS = [
  { href: "/checklist", label: "What to bring" },
  { href: "/pricing", label: "Pricing" },
  { href: "/services", label: "Services" },
  { href: "/check-in", label: "Check in" },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-line bg-mist">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <div className="font-display text-lg font-extrabold text-ink">
              88 Title
            </div>
            <p className="mt-2 text-sm text-fog">{SITE.tagline}</p>
            <p className="mt-4 text-sm text-fog">{SITE.addressPlaceholder}</p>
            <p className="text-sm text-fog">{SITE.phonePlaceholder}</p>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-fog">
              Hours
            </div>
            <ul className="mt-3 space-y-1 text-sm text-ink">
              <li>{SITE.hours.weekday}</li>
              <li>{SITE.hours.saturday}</li>
              <li>{SITE.hours.sunday}</li>
            </ul>
            <p className="mt-2 text-xs text-fog">
              Hours are placeholders pending confirmation.
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-fog">
              Site
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-medium text-ink transition-colors hover:text-plate"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 rounded-xl border border-line bg-paper p-4 text-xs leading-relaxed text-fog">
          <p>
            <span className="font-semibold text-ink">
              Public tag fee disclosure.
            </span>{" "}
            {OMV_DISCLOSURE}
          </p>
          <p className="mt-2">
            88 Title is a private public tag agency and is not the Louisiana
            Office of Motor Vehicles (OMV).
          </p>
        </div>

        <p className="mt-8 text-xs text-fog">
          © {year} 88 Title. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
