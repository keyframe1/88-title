type PlateGraphicProps = {
  className?: string;
};

/**
 * Decorative Louisiana-style license plate used in the hero. Inline SVG so it
 * uses the brand display font and scales without layout shift (fixed 2:1
 * viewBox). Purely decorative beyond its `aria-label`.
 */
export function PlateGraphic({ className }: PlateGraphicProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 360 180"
      role="img"
      aria-label="A Louisiana license plate that reads 88 Title — public tag agency, Metairie."
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Plate body + embossed inner rim */}
      <rect
        x="6"
        y="6"
        width="348"
        height="168"
        rx="18"
        fill="#ffffff"
        stroke="#14213d"
        strokeWidth="4"
      />
      <rect
        x="16"
        y="16"
        width="328"
        height="148"
        rx="12"
        fill="none"
        stroke="#14213d"
        strokeWidth="2"
        opacity="0.3"
      />

      {/* Bolt holes */}
      <circle cx="104" cy="27" r="4" fill="#14213d" opacity="0.45" />
      <circle cx="256" cy="27" r="4" fill="#14213d" opacity="0.45" />

      {/* Top jurisdiction label */}
      <text
        x="180"
        y="48"
        textAnchor="middle"
        fontFamily="var(--font-archivo), system-ui, sans-serif"
        fontSize="17"
        fontWeight="700"
        letterSpacing="7"
        fill="#14213d"
      >
        LOUISIANA
      </text>

      {/* Plate number / wordmark */}
      <text
        x="180"
        y="116"
        textAnchor="middle"
        fontFamily="var(--font-archivo), system-ui, sans-serif"
        fontSize="60"
        fontWeight="800"
        letterSpacing="2"
        fill="#14213d"
      >
        88<tspan fill="#c8102e"> · </tspan>TITLE
      </text>

      {/* Bottom strap line */}
      <text
        x="180"
        y="150"
        textAnchor="middle"
        fontFamily="var(--font-archivo), system-ui, sans-serif"
        fontSize="12"
        fontWeight="700"
        letterSpacing="3"
        fill="#14213d"
      >
        PUBLIC TAG AGENCY
      </text>
    </svg>
  );
}
