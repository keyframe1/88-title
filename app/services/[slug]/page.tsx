import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlateButton } from "@/components/PlateButton";
import { VisitTime } from "@/components/VisitTime";
import { getTransactionPath, transactionPaths } from "@/lib/checklists";

export function generateStaticParams() {
  return transactionPaths.map((path) => ({ slug: path.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const path = getTransactionPath(slug);
  if (!path) {
    return { title: "Service not found" };
  }
  return {
    title: path.label,
    description: `${path.blurb} See exactly what to bring for a ${path.label.toLowerCase()} at 88 Title in Metairie, then check in online.`,
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const path = getTransactionPath(slug);
  if (!path) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link
        href="/services"
        className="text-sm font-semibold text-fog underline-offset-2 transition-colors hover:text-plate hover:underline"
      >
        ← All services
      </Link>

      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-plate">
        What to bring
      </p>
      <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">{path.label}</h1>
      <p className="mt-4 text-lg leading-relaxed text-fog">{path.blurb}</p>

      <ul className="mt-8 space-y-3">
        {path.items.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-3 rounded-xl border border-line bg-paper p-4"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="mt-0.5 h-5 w-5 shrink-0 text-ink"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM13.7 8.3a1 1 0 00-1.4-1.4L9 10.2 7.7 8.9a1 1 0 10-1.4 1.4l2 2a1 1 0 001.4 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="min-w-0">
              <span className="block font-medium text-ink">{item.label}</span>
              {item.detail ? (
                <span className="mt-0.5 block text-sm text-fog">
                  {item.detail}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-8 rounded-2xl border border-line bg-mist p-5 text-sm leading-relaxed text-fog">
        General guidance to help you avoid a second trip — not legal advice.
        Requirements can vary by situation; we confirm the specifics for your
        case in office.
      </div>

      <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <PlateButton href="/checklist" size="lg">
          Build your checklist
        </PlateButton>
        <Link
          href="/check-in"
          className="font-semibold text-ink underline-offset-4 transition-colors hover:text-plate hover:underline"
        >
          Check in online →
        </Link>
      </div>

      <div className="mt-12">
        <VisitTime />
      </div>
    </div>
  );
}
