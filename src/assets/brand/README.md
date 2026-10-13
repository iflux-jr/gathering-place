# Brand files

These are **placeholders**. Every screen shows them through `src/components/brand/Logo.tsx`, so replacing these files changes the logo everywhere without touching any code.

| File | What it is | Shown on |
|---|---|---|
| `mark.svg` | The symbol on its own (square) | Light or dark backgrounds |
| `wordmark.svg` | "The Gathering Place" in dark ink | Light backgrounds |
| `wordmark-on-dark.svg` | "The Gathering Place" in white | Dark backgrounds (sidebar, header) |
| `icon.svg` | App icon: the mark on a rounded dark tile | Source for the favicon and home-screen icons |

## Replacing them

1. Save the real files over these four, keeping the same names. Each SVG needs a `viewBox`. Convert any text to outlines so it looks the same on every device.
2. Regenerate the icons in `public/` from the new `icon.svg`. One way is to upload it to [realfavicongenerator.net](https://realfavicongenerator.net), then replace `public/favicon.svg`, `favicon.ico`, `apple-touch-icon.png` (180×180), `icon-192.png` and `icon-512.png`. Keep the symbol inside the central 80% of the tile so Android's rounded masks don't crop it.
3. If the brand colours change, update `theme_color` and `background_color` in `public/manifest.webmanifest` and the `theme-color` meta tag in `index.html`.

## The placeholder concept

Four overlapping circles round a centre: people gathered at a table. They use the four accent colours of the design system (flame, lime, lilac, sky). The wordmark is set in Outfit Bold, with "Place" in flame.
