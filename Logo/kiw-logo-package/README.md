# King Iron Works: logo package

This is a vector recreation of the original KIW logo (`~/Desktop/KIW-Logo/logo.jpg`). It was traced at 4x and checked against the original at high zoom. The design is unchanged. The light "sticker" outline of the original was left off, so the transparent files have clean edges on any background.

**Colors (sRGB, sampled from the original):** Black `#282425` · Bar gold `#C38D35` · Crown gold `#D4A034` · White `#FFFFFF`

## Which file to use

| Background | Use |
|---|---|
| White or light | `horizontal/kiw-horizontal-color-transparent` |
| Dark or photo | `horizontal/kiw-horizontal-white-gold-transparent` (the letters turn white and the gold stays) |
| One color: print, engraving, vinyl, stamp | `-black-`, `-charcoal-` or `-white-transparent` (the bar text is cut out) |
| Needs a solid box | `-color-white` (on white) or `-color-dark` (on #111) |
| Small or square spots: avatar, social profile, watermark | `monogram/` (crown over K) or `icon/kiw-crown-*` |
| App store or home screen | `app-icon/kiw-app-icon-1024.png` (opaque; iOS rounds the corners) |
| Website | `favicon/`: copy everything to the site root (see the tags below) |

**Formats:** Each layout comes as an SVG plus PNGs at 1x, `@2x` and `@4x`. Horizontal PNGs are 800, 1600 and 3200 px wide. Icon and monogram PNGs are 256, 512 and 1024 px square. Use the SVG for signs, print, trucks and shirts. Use the PNG for web, email and documents. The SVGs use outlines only, so no fonts are needed.

## Rules
- Never stretch, skew, recolor, rotate, add effects to, or re-type the logo.
- Leave clear space around the logo at least the height of the crown's band on every side.
- Minimum size: the horizontal logo should be at least 120 px wide on screen or 1.25 in in print. Below that, use the monogram.
- Put the color logo only on light backgrounds and the white-gold logo only on dark ones.
- Embroidery needs stitch digitizing by the supplier; send them the black SVG.

## Favicon tags
```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
```

See `contact-sheet.png` for every variant on dark and light backgrounds. `_build/` holds the trace and export scripts (potrace + resvg), so the package can be rebuilt.
