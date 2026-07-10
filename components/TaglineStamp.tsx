/**
 * The tagline stamp — "Get legal, get rollin'" pressed into the check-in success
 * moment, and ONLY there. A rubber-stamp impression: the tagline set in Overpass
 * tracked caps inside a plate-red engraved double ring, canted like a hand stamp.
 *
 * Motion lives in globals.css: `.tstamp` is the settled, inked impression, so a
 * prefers-reduced-motion viewer sees the finished stamp with no motion; adding
 * `.tstamp--press` plays the one-shot ~400ms press-in on mount (no-preference
 * only). Server-safe: the press-in is a CSS mount animation, so no client hook.
 *
 * The tagline is the brand's English signature and stays English in every locale;
 * `support` is an optional localized gloss shown quietly beneath it, so non-English
 * readers get the meaning without translating the wordmark.
 */
export function TaglineStamp({
  tagline,
  support,
  className = "",
}: {
  tagline: string;
  support?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <span
        className="tstamp tstamp--press inline-flex items-center rounded-lg border-[2.5px] border-plate/70 px-4 py-2 font-display text-sm font-extrabold uppercase tracking-[0.14em] text-plate"
        style={{
          boxShadow:
            "inset 0 0 0 3px var(--color-paper), inset 0 0 0 4px rgb(200 16 46 / 0.4)",
        }}
        role="img"
        aria-label={tagline}
      >
        {tagline}
      </span>
      {support ? <p className="mt-2 text-xs text-fog">{support}</p> : null}
    </div>
  );
}
