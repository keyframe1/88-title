"use client";

import { useId } from "react";
import type { CSSProperties } from "react";

/**
 * Remy — the 88 Title brown pelican, engraved.
 *
 * Ported from the approved Claude Design pose library (public/"88 Title
 * Pelican.dc.html"). A solid figure: a warm paper-cream body (`--color-figure`)
 * with two-weight navy linework and density hatching for depth, one light
 * direction (upper-left), a designed draftsman's eye, and one plate-red accent
 * used ONLY on the seal. Every colour maps to a brand CSS variable — no hexes.
 *
 * Decorative always: aria-hidden, never focusable, pointer-events-none, and
 * zero CLS — the SVG reserves its final footprint (width/height fixed to
 * `size`) while the entrance arc animates in an `overflow: visible` box that
 * never affects layout.
 *
 * Motion lives entirely in globals.css (the `remy*` keyframes + the
 * `.remy-anim` bindings, gated to `prefers-reduced-motion: no-preference`),
 * matching how every other brand animation on the site is wired. So a
 * reduced-motion viewer sees the settled landed pose with no entrance (seal
 * already set for the stamp-perch), and the one-shot entrance plays ONCE per
 * mount and never replays on a parent re-render (CSS `both` fill + a stable
 * per-mount key on the animated groups).
 *
 * Tiny-scale rule from the export: below `EYE_RING_MIN` rendered pixels the
 * eye's ring-and-catchlight group is dropped and the pupil dot carries alone,
 * so the eye never muddies at counter sizes.
 */
export type PelicanPose = "rest" | "present" | "stamp-perch";

const VIEWBOX = "0 0 400 460";
const RATIO = 400 / 460; // width : height of the shared viewBox

/** Below this rendered height (px) the eye ring is dropped (pupil dot only). */
const EYE_RING_MIN = 90;

// ---- colours (brand tokens only) ------------------------------------------
const NAVY = "var(--color-ink)";
const RED = "var(--color-plate)";
const FIG = "var(--color-figure)"; // warm watermark cream, light figure on any ground

// ---- stroke helpers (mirror the export's S / H / L / hat / filled) ---------
function s(width: number, extra?: CSSProperties): CSSProperties {
  return {
    fill: "none",
    stroke: NAVY,
    strokeWidth: width,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ...extra,
  };
}
const H = (extra?: CSSProperties) => s(6.5, extra); // heavy silhouette outline
const L = (extra?: CSSProperties) => s(2.2, extra); // light interior line
const HAT = () => s(1.6); // fine hatch
const SOLID: CSSProperties = { fill: FIG, stroke: "none" }; // filled underlay
const filled = (width = 6.5): CSSProperties => s(width, { fill: FIG }); // outline + fill

// ---- shared bits -----------------------------------------------------------
function Hatch({ ds }: { ds: string[] }) {
  return (
    <g style={HAT()}>
      {ds.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </g>
  );
}

function Eye({ x, y, tiny }: { x: number; y: number; tiny: boolean }) {
  if (tiny) return <circle cx={x} cy={y} r={5} style={{ fill: NAVY }} />;
  return (
    <g>
      <circle cx={x} cy={y} r={5.6} style={{ fill: FIG, stroke: NAVY, strokeWidth: 1.6 }} />
      <circle cx={x} cy={y} r={3} style={{ fill: NAVY }} />
      <circle cx={x - 1.4} cy={y - 1.7} r={1.05} style={{ fill: FIG }} />
    </g>
  );
}

function Ground() {
  return <line x1={40} y1={418} x2={360} y2={418} style={H()} />;
}

function PlantedFoot({ ax }: { ax: number }) {
  return (
    <g>
      <path
        d={`M${ax - 6} 400 C ${ax - 10} 410 ${ax - 5} 417 ${ax + 4} 417 L ${ax + 30} 417 C ${
          ax + 36
        } 417 ${ax + 36} 410 ${ax + 29} 408 L ${ax + 2} 404 Z`}
        style={filled(5.5)}
      />
      <g style={L()}>
        <path d={`M${ax + 10} 416 L ${ax + 12} 409`} />
        <path d={`M${ax + 20} 416 L ${ax + 22} 409`} />
      </g>
    </g>
  );
}

// ---- pose A · REST (bird + the embosser at his feet) -----------------------
function RestBird({ tiny }: { tiny: boolean }) {
  return (
    <>
      <path
        d="M150 232 C 162 202 174 176 188 156 C 195 138 210 124 234 122 C 250 121 264 124 272 132 C 305 148 348 158 390 166 L 396 164 C 399 171 394 178 387 175 C 372 199 342 224 306 226 C 286 227 268 220 260 202 C 256 194 255 188 256 182 C 250 205 240 224 210 238 C 185 236 165 233 150 232 Z"
        style={SOLID}
      />
      <path d="M92 300 C 70 306 48 300 30 286 C 54 286 74 288 96 294 Z" style={filled()} />
      <path
        d="M190 238 C 214 250 224 286 210 320 C 200 342 160 352 128 342 C 100 334 86 312 90 286 C 94 258 120 238 150 232 C 165 230 180 232 190 238 Z"
        style={filled()}
      />
      <Hatch
        ds={[
          "M212 262 C 222 286 221 308 210 324",
          "M205 262 C 215 286 214 308 203 324",
          "M198 264 C 207 287 206 308 196 324",
          "M191 266 C 199 288 198 307 189 323",
          "M300 214 C 316 220 338 220 356 212",
          "M303 208 C 318 214 338 214 353 206",
          "M307 202 C 320 207 338 207 350 200",
          "M156 360 L 160 374",
          "M176 362 L 180 376",
        ]}
      />
      <path
        d="M175 246 C 140 250 105 266 82 296 C 118 304 158 300 192 288 C 210 282 205 250 175 246 Z"
        style={H()}
      />
      <Hatch
        ds={[
          "M120 268 C 108 278 96 288 86 296",
          "M138 264 C 124 276 110 286 98 296",
          "M158 260 C 142 274 126 286 112 297",
          "M178 256 C 160 272 142 285 126 298",
        ]}
      />
      <g>
        <path
          d="M150 232 C 162 202 174 176 188 156 C 195 138 210 124 234 122 C 250 121 264 124 272 132 C 305 148 348 158 390 166 L 396 164 C 399 171 394 178 387 175"
          style={H()}
        />
        <path d="M264 150 C 300 160 345 166 384 172" style={H()} />
        <path
          d="M387 175 C 372 199 342 224 306 226 C 286 227 268 220 260 202 C 256 194 255 188 256 182"
          style={H()}
        />
        <path d="M256 182 C 250 205 240 224 210 238" style={H()} />
        <path d="M304 190 C 300 205 296 216 290 224" style={L()} />
      </g>
      <g style={H()}>
        <path d="M150 344 C 148 366 146 388 146 402" />
        <path d="M182 344 C 184 366 185 388 184 402" />
      </g>
      <PlantedFoot ax={140} />
      <PlantedFoot ax={178} />
      <Eye x={258} y={142} tiny={tiny} />
      {/* embosser press at his feet */}
      <g>
        <rect x={296} y={400} width={58} height={15} rx={5} style={filled()} />
        <path
          d="M312 400 L 312 378 C 312 372 318 368 326 368 C 334 368 340 372 340 378 L 340 400"
          style={filled()}
        />
        <line x1={326} y1={368} x2={326} y2={354} style={H()} />
        <line x1={314} y1={354} x2={338} y2={354} style={H()} />
        <circle cx={326} cy={407} r={7.5} style={{ fill: "none", stroke: RED, strokeWidth: 3 }} />
        <circle cx={326} cy={407} r={2.3} style={{ fill: RED }} />
      </g>
    </>
  );
}

// ---- pose B · PRESENTING (gaze down, gesturing at the empty space) ---------
function PresentBird({ tiny }: { tiny: boolean }) {
  return (
    <>
      <path
        d="M150 232 C 160 204 172 180 186 162 C 196 150 210 142 226 142 C 242 142 256 148 264 160 C 288 190 322 224 354 252 L 360 251 C 363 257 358 263 351 259 C 340 262 318 262 300 250 C 289 243 283 228 284 210 C 278 222 258 232 210 240 C 185 237 165 234 150 232 Z"
        style={SOLID}
      />
      <path d="M92 300 C 70 306 48 300 30 286 C 54 286 74 288 96 294 Z" style={filled()} />
      <path
        d="M190 238 C 214 250 224 286 210 320 C 200 342 160 352 128 342 C 100 334 86 312 90 286 C 94 258 120 238 150 232 C 165 230 180 232 190 238 Z"
        style={filled()}
      />
      <Hatch
        ds={[
          "M212 262 C 222 286 221 308 210 324",
          "M205 262 C 215 286 214 308 203 324",
          "M198 264 C 207 287 206 308 196 324",
          "M191 266 C 199 288 198 307 189 323",
          "M304 248 C 318 254 334 252 348 244",
          "M306 242 C 320 248 336 246 350 238",
          "M310 236 C 322 241 336 239 348 232",
          "M156 360 L 160 374",
          "M176 362 L 180 376",
        ]}
      />
      <path
        d="M175 246 C 140 250 105 266 82 296 C 118 304 158 300 192 288 C 210 282 205 250 175 246 Z"
        style={H()}
      />
      <Hatch
        ds={[
          "M120 268 C 108 278 96 288 86 296",
          "M138 264 C 124 276 110 286 98 296",
          "M158 260 C 142 274 126 286 112 297",
          "M178 256 C 160 272 142 285 126 298",
        ]}
      />
      <g>
        <path
          d="M150 232 C 160 204 172 180 186 162 C 196 150 210 142 226 142 C 242 142 256 148 264 160 C 288 190 322 224 354 252 L 360 251 C 363 257 358 263 351 259"
          style={H()}
        />
        <path d="M256 172 C 284 196 320 228 350 254" style={H()} />
        <path
          d="M352 255 C 340 262 318 262 300 250 C 289 243 283 228 284 210"
          style={H()}
        />
        <path d="M284 210 C 278 222 258 232 210 240" style={H()} />
        <path d="M320 232 C 316 244 310 252 302 256" style={L()} />
      </g>
      <g style={H()}>
        <path d="M150 344 C 148 366 146 388 146 402" />
        <path d="M182 344 C 184 366 185 388 184 402" />
      </g>
      <PlantedFoot ax={140} />
      <PlantedFoot ax={178} />
      <Eye x={250} y={156} tiny={tiny} />
    </>
  );
}

// ---- pose C support · the embosser post + doc, seal, impact -----------------
function EmbosserPost() {
  return (
    <>
      <rect x={150} y={404} width={170} height={15} rx={4} style={filled()} />
      <rect x={214} y={392} width={52} height={14} rx={5} style={filled()} />
      <line x1={240} y1={392} x2={240} y2={314} style={H()} />
      <rect x={220} y={301} width={40} height={13} rx={6} style={filled()} />
    </>
  );
}

function SealOnDoc() {
  return (
    <g>
      <circle cx={292} cy={412} r={7.5} style={{ fill: "none", stroke: RED, strokeWidth: 3 }} />
      <path
        d="M292 405 L 294 410 L 300 410 L 295 414 L 297 419 L 292 415 L 287 419 L 289 414 L 284 410 L 290 410 Z"
        style={{ fill: RED }}
      />
    </g>
  );
}

function ImpactTicks() {
  return (
    <g style={s(2.8, { stroke: RED })}>
      <path d="M212 296 L 205 287" />
      <path d="M268 296 L 275 287" />
    </g>
  );
}

// ---- pose C · STAMP PERCH (the perched bird on the embosser) ----------------
function PerchBird({ tiny }: { tiny: boolean }) {
  return (
    <>
      <path
        d="M250 200 C 255 176 265 156 281 148 C 297 140 313 144 321 154 C 344 168 366 178 386 184 L 392 182 C 395 189 390 195 383 192 C 372 212 348 232 320 234 C 304 235 290 228 284 214 C 281 207 281 200 282 194 C 278 210 270 226 250 240 L 250 200 Z"
        style={SOLID}
      />
      <path
        d="M225 190 C 253 194 267 220 263 250 C 259 280 235 296 209 296 C 183 296 169 274 171 244 C 173 212 197 188 225 190 Z"
        style={filled()}
      />
      <Hatch
        ds={[
          "M244 224 C 252 246 250 270 240 288",
          "M238 222 C 246 244 244 270 234 288",
          "M232 222 C 240 244 238 270 228 288",
          "M320 224 C 334 230 352 228 366 220",
          "M323 218 C 336 224 352 222 364 214",
          "M220 300 L 224 312",
        ]}
      />
      <path
        d="M228 210 C 206 214 184 226 172 248 C 194 254 218 250 236 242 C 246 238 246 216 228 210 Z"
        style={H()}
      />
      <Hatch
        ds={["M196 228 C 187 237 180 244 174 248", "M212 222 C 200 233 189 242 180 248"]}
      />
      <g>
        <path
          d="M250 200 C 255 176 265 156 281 148 C 297 140 313 144 321 154 C 344 168 366 178 386 184 L 392 182 C 395 189 390 195 383 192"
          style={H()}
        />
        <path d="M300 168 C 326 176 356 184 378 189" style={H()} />
        <path
          d="M383 192 C 372 212 348 232 320 234 C 304 235 290 228 284 214 C 281 207 281 200 282 194"
          style={H()}
        />
        <path d="M282 194 C 278 210 270 226 250 240" style={H()} />
        <path d="M318 200 C 314 213 310 222 304 230" style={L()} />
      </g>
      <g style={H()}>
        <path d="M214 292 C 220 298 230 302 238 303" />
        <path d="M234 292 C 242 298 250 301 256 303" />
      </g>
      <g style={H()}>
        <path d="M238 303 C 234 308 234 313 239 315" />
        <path d="M256 303 C 260 308 260 313 255 315" />
        <path d="M247 304 C 253 307 257 310 259 314" />
      </g>
      <Eye x={288} y={160} tiny={tiny} />
    </>
  );
}

// ---- entrance · the flight form (glides in, then crossfades to the pose) ----
function FlightBird({ tiny }: { tiny: boolean }) {
  return (
    <>
      <path
        d="M184 210 C 164 190 138 174 112 166 C 128 184 152 200 178 214 Z"
        style={filled()}
      />
      <path d="M150 240 C 130 250 110 254 92 250 C 112 242 130 238 148 234 Z" style={filled()} />
      <path
        d="M150 240 C 180 252 216 248 246 234 C 268 224 272 208 258 199 C 240 188 194 194 166 205 C 146 213 138 232 150 240 Z"
        style={filled()}
      />
      <path
        d="M250 210 C 256 194 270 184 286 184 C 300 184 312 189 318 198 C 340 204 360 210 376 212 L 382 210 C 385 216 380 222 373 219 C 362 234 342 246 322 244 C 310 243 302 236 300 226 C 298 232 294 238 286 242 L 250 210 Z"
        style={SOLID}
      />
      <Hatch
        ds={[
          "M170 214 C 184 222 202 224 220 222",
          "M168 220 C 182 228 202 230 222 228",
          "M168 226 C 182 234 204 236 224 234",
          "M170 232 C 184 240 204 241 222 239",
          "M176 238 C 188 244 204 245 220 243",
        ]}
      />
      <path
        d="M216 210 C 194 188 162 168 128 158 C 118 155 112 162 118 170 C 146 190 178 204 206 214 Z"
        style={filled()}
      />
      <Hatch
        ds={[
          "M128 158 C 122 164 118 171 116 178",
          "M140 162 C 134 170 130 178 128 185",
          "M154 168 C 148 176 144 185 142 192",
          "M182 198 C 162 188 140 178 122 170",
        ]}
      />
      <g>
        <path
          d="M250 210 C 256 194 270 184 286 184 C 300 184 312 189 318 198 C 340 204 360 210 376 212 L 382 210 C 385 216 380 222 373 219"
          style={H()}
        />
        <path d="M300 200 C 326 206 354 212 372 215" style={H()} />
        <path
          d="M373 219 C 362 234 342 246 322 244 C 310 243 302 236 300 226"
          style={H()}
        />
        <path d="M300 226 C 298 232 294 238 286 242" style={H()} />
      </g>
      <g style={H()}>
        <path d="M212 246 C 220 264 230 282 242 298" />
        <path d="M230 244 C 238 262 248 282 260 298" />
      </g>
      <g style={H()}>
        <path d="M242 298 C 238 303 238 308 243 310" />
        <path d="M260 298 C 264 303 264 308 259 310" />
        <path d="M251 299 C 257 302 261 305 263 309" />
      </g>
      <Eye x={292} y={196} tiny={tiny} />
    </>
  );
}

/** The landed (resting) bird for a given pose — the crossfade target. */
function LandedBird({ pose, tiny }: { pose: PelicanPose; tiny: boolean }) {
  if (pose === "rest") return <RestBird tiny={tiny} />;
  if (pose === "stamp-perch") return <PerchBird tiny={tiny} />;
  return <PresentBird tiny={tiny} />;
}

/** The always-static scaffolding a pose stands on (never animated). */
function Scaffold({ pose }: { pose: PelicanPose }) {
  return (
    <>
      <Ground />
      {pose === "stamp-perch" ? <EmbosserPost /> : null}
    </>
  );
}

export function Pelican({
  pose = "present",
  entrance = false,
  size = 76,
  className = "",
}: {
  pose?: PelicanPose;
  /** Play the one-shot flight-arc + land + settle entrance (once per mount). */
  entrance?: boolean;
  /** Rendered height in px. Width follows the shared 400:460 viewBox. */
  size?: number;
  className?: string;
}) {
  // A stable per-mount id keys the animated groups, so a parent re-render never
  // recreates them (and never replays the one-shot entrance). It plays once, on
  // mount; CSS `both` fill holds the settled frame.
  const id = useId();
  const tiny = size < EYE_RING_MIN;
  const isPerch = pose === "stamp-perch";

  return (
    <svg
      viewBox={VIEWBOX}
      width={Math.round(size * RATIO)}
      height={size}
      className={`remy${entrance ? " remy-anim" : ""}${className ? ` ${className}` : ""}`}
      style={{ overflow: "visible", pointerEvents: "none", display: "block" }}
      aria-hidden="true"
      focusable={false}
    >
      {entrance ? (
        <>
          <Scaffold pose={pose} />
          <g key={`${id}-flight`} className="remy-flight">
            <FlightBird tiny={tiny} />
          </g>
          <g key={`${id}-landed`} className="remy-landed">
            <LandedBird pose={pose} tiny={tiny} />
          </g>
          {isPerch ? (
            <>
              <g key={`${id}-seal`} className="remy-seal">
                <SealOnDoc />
              </g>
              <g key={`${id}-impact`} className="remy-impact">
                <ImpactTicks />
              </g>
            </>
          ) : null}
        </>
      ) : (
        <>
          <Scaffold pose={pose} />
          {isPerch ? <SealOnDoc /> : null}
          <LandedBird pose={pose} tiny={tiny} />
        </>
      )}
    </svg>
  );
}
