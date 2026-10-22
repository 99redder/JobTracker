# Job Tracker Icons

The app icon is the **wrench from the logo** (the Feather "tool" icon used in `index.html`), drawn in black on the brand yellow `#facc15`. It is used for the browser tab/bookmark icon, the iPhone/Android home screen icon, and desktop installs.

## Files

| File | Size | Used for |
| --- | --- | --- |
| `icon.svg` | vector | SVG favicon (modern browsers) and design source (rounded tile) |
| `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png` | 16–48 | Browser tabs and bookmarks (bolder wrench so it reads at 16px) |
| `apple-touch-icon.png` | 180 | iPhone/iPad home screen. Full bleed with no transparency: iOS rounds the corners itself |
| `icon-192x192.png`, `icon-512x512.png` | 192, 512 | Manifest `purpose: any` (desktop installs). Rounded tile with transparent corners |
| `icon-maskable-192x192.png`, `icon-maskable-512x512.png` | 192, 512 | Manifest `purpose: maskable` (Android home screen). Full bleed, wrench inside the 80% safe zone |

## Changing the icon

1. Open `generate-icons.html` in a browser. It previews every size.
2. To change the design, edit `VARIANTS` (corner radius, wrench size, line weight) or the colors in `iconSVG()`.
3. Click **Download All** and replace the files of the same name in the repo root.
4. Bump `CACHE_NAME` in `sw.js` so installed apps pick up the new files.

Phones cache home screen icons, so an already-installed app may keep the old icon until it is removed and installed again.
