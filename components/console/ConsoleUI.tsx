import type { ReactNode } from "react";

/**
 * Shared back-office console chrome (staff console + dealer portal).
 *
 * These primitives impose one consistent dashboard shell across every tab: a
 * warm-gray surface (set on the layout <main>) that white panels read as cards
 * on, one page-container width, one page-header pattern, one panel/stat-tile
 * treatment, and one red-eyebrow section pattern. They are presentational only
 * (no state, no data), so they compose freely inside both server pages and the
 * "use client" console components.
 */

/** Page container: one max-width and padding shared by every console tab. */
export function ConsolePage({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</div>;
}

/** Page header: optional red eyebrow, then title + one-line description. */
export function ConsolePageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
}) {
  return (
    <header className="border-b border-line pb-5">
      {eyebrow ? <Eyebrow className="mb-2">{eyebrow}</Eyebrow> : null}
      <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
      {description ? (
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-fog">
          {description}
        </p>
      ) : null}
    </header>
  );
}

/** The plate-red uppercase eyebrow (the "COUNTER REFERENCE" pattern). */
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`text-sm font-semibold uppercase tracking-[0.18em] text-plate ${
        className ?? ""
      }`}
    >
      {children}
    </p>
  );
}

/** Section heading: red eyebrow + title + optional description, one recipe. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  id,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  id?: string;
}) {
  return (
    <div>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2
        id={id}
        className={`font-display text-lg font-extrabold text-ink sm:text-xl ${
          eyebrow ? "mt-2" : ""
        }`}
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-1 text-sm leading-relaxed text-fog">{description}</p>
      ) : null}
    </div>
  );
}

/** Standard white panel — one border, radius, and padding for every section. */
export function ConsolePanel({
  children,
  className,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "aside";
}) {
  return (
    <Tag
      className={`rounded-2xl border border-line bg-white p-5 sm:p-6 ${
        className ?? ""
      }`}
    >
      {children}
    </Tag>
  );
}

/** Dashboard stat tile (SERVING / WAITING …): stronger weight than a label. */
export function StatTile({
  label,
  value,
}: {
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(20,33,61,0.04)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-fog">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl font-extrabold text-ink">
        {value}
      </p>
    </div>
  );
}
