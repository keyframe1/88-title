# 88 Title — App Icons & Favicon

White "88" on ink navy (#14213D), plate-style frame. Plain variant (no red dot) chosen as primary.

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

Note: favicons drop the plate frame so the "88" stays legible at tiny sizes.
The maskable icon has ~20% safe padding so Android's circle/squircle crop won't clip the 88.
