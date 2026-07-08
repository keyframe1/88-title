# 88 Title — App Icons & Favicon

The drawn 88 monogram (paper `#FAFAF8`) on ink navy (`#14213D`), no frame — the
mark's counters ARE the identity. Geometry comes from `lib/brand-mark.ts` (the
same path the site renders); the whole set is regenerated from it with sharp,
so never hand-edit these files individually.

## Files and where they go

| File | Purpose | Placement |
|------|---------|-----------|
| `icon.svg` | Scalable source | `/public` or as needed |
| `favicon.ico` | Browser tab (multi-res 16/32/48) | `/app/favicon.ico` (Next.js auto-serves) |
| `favicon-16.png` / `-32.png` / `-48.png` | PNG favicons | `/public` |
| `apple-touch-icon.png` (180px) | iOS home screen | `/public` (Next.js auto-detects in /app too) |
| `icon-192.png` | PWA manifest icon | `/public` |
| `icon-512.png` | PWA manifest icon | `/public` |
| `icon-maskable-512.png` | PWA Android adaptive (safe padding) | `/public` |

## Manifest reference (the PWA pass will wire this)
- 192 + 512 as standard `"purpose": "any"`
- `icon-maskable-512` as `"purpose": "maskable"`
- theme_color: `#14213D`, background_color: `#FAFAF8`

Note: the favicon sizes draw the monogram slightly larger (80-84% of the canvas
vs 70%) so it stays legible at tiny sizes. The maskable icon has ~20% safe
padding so Android's circle/squircle crop won't clip the 88.
`ALT-accent-icon-192.png` is a leftover unused variant of the retired
text-in-a-box mark (not referenced anywhere).
