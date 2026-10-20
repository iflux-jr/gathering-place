# Brand files

These are **placeholders** drawn from the brand board (spiral mark, Soft Cream #F2E9DF, Orange #E57A06, Brown #5A3825). Every screen shows them through `src/components/brand/Logo.tsx`, so replacing these files changes the logo everywhere without touching any code.

| File | What it is | `<Logo>` variant |
|---|---|---|
| `mark.svg` | The spiral on its own, in brown | `variant="mark"` on light backgrounds |
| `mark-on-dark.svg` | The spiral in cream | `variant="mark" on="dark"` |
| `wordmark.svg` | "The Gathering Place", stacked, brown and orange | `variant="wordmark"` |
| `wordmark-on-dark.svg` | The same in cream and orange | `variant="wordmark" on="dark"` |
| `icon.svg` | App icon and favicon: the cream spiral on a brown tile | `variant="favicon"`, and the source for the files in `public/` |

`variant="lockup"` (the default) shows the mark and the wordmark side by side.

## Replacing them

1. Save the real files over these, keeping the same names. Each SVG needs a `viewBox`. Convert any text to outlines so it looks the same on every device.
2. Regenerate the icons in `public/` from the new `icon.svg`. One way is to upload it to [realfavicongenerator.net](https://realfavicongenerator.net), then replace `public/favicon.svg`, `favicon.ico`, `apple-touch-icon.png` (180×180, square), `icon-192.png` and `icon-512.png`. Keep the symbol inside the central 80% of the tile so Android's rounded masks don't crop it.
3. If the brand colours change, update `theme_color` and `background_color` in `public/manifest.webmanifest` and the `theme-color` meta tag in `index.html`.

The placeholder wordmark is set in Bricolage Grotesque ExtraBold, outlined.
