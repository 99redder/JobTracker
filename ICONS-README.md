# JobTracker Icons Setup

## Construction-Themed Hard Hat Icon

A black and yellow hard hat icon has been designed for your JobTracker PWA.

## Files Created

- **icon.svg** - Original SVG icon design
- **generate-icons.html** - Icon generator tool (open in browser)
- **manifest.json** - PWA manifest file
- **index.html** - Updated with favicon and manifest links

## How to Generate Icons

### Step 1: Generate PNG Files

1. Open `generate-icons.html` in your web browser
2. Click the "Generate All Icons" button
3. Preview the icons in different sizes
4. Click "Download All" to download all icon files

The following files will be downloaded:
- `favicon-16x16.png` - Browser tab icon (small)
- `favicon-32x32.png` - Browser tab icon (medium)
- `favicon-48x48.png` - Browser tab icon (large)
- `apple-touch-icon.png` - iOS home screen icon (180x180)
- `icon-192x192.png` - PWA icon (Android)
- `icon-512x512.png` - PWA icon (high resolution)

### Step 2: Place Icons in Project

1. Move all downloaded PNG files to your JobTracker directory
2. Keep them in the root directory (same level as index.html)

### Step 3: Verify Setup

1. Open your site in a browser
2. Check the browser tab - you should see the hard hat icon
3. On mobile, add to home screen - the icon should appear

## Icon Design Details

**Colors:**
- Background: Black (#000000)
- Hard hat: Yellow (#FCD34D)
- Shading: Amber (#F59E0B)

**Symbol:** Construction hard hat - represents construction/job tracking

## PWA Installation

With the manifest.json file, users can now:
- **iOS**: Add to home screen from Safari share menu
- **Android**: Install app from Chrome menu
- **Desktop**: Install from address bar icon (Chrome/Edge)

The app will:
- Open in standalone mode (no browser UI)
- Use the yellow theme color (#FCD34D)
- Display the hard hat icon on the home screen
- Work in portrait orientation

## Troubleshooting

**Icons not showing?**
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Verify PNG files are in the root directory
- Check browser console for 404 errors

**PWA not installable?**
- Ensure manifest.json is in root directory
- Verify icon files exist at specified paths
- Must be served over HTTPS (GitHub Pages ✓)

## Future Customization

To change the icon:
1. Edit `icon.svg` with your design
2. Open `generate-icons.html` and update the `iconSVG` variable
3. Regenerate PNG files
4. Replace the old PNG files
