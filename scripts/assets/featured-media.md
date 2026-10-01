# Featured media

- Album artwork: [Album Cover.png supplied by HeadHunters NW](https://drive.google.com/file/d/13xkT68TcDnIyz5y66JiVg0lbXjP_KY4l/view). Original 1200×1200; converted to WebP at quality 88 without cropping or removing credits.
- Episode thumbnail: [YouTube max-resolution thumbnail](https://i.ytimg.com/vi/ArPZd4Pzaxk/maxresdefault.jpg). Original 1280×720; converted to WebP at quality 85.
- Sharing image: `featured-sharing.svg` provides the GhostJob background and typography. The original square artwork is composited at x=686, y=75, resized to 480×480, then exported as a 1200×630 JPEG at quality 92. No generative edits to the guests or host artwork.

The final images are checked into `public/media`; no image-processing dependency or external image request is needed at runtime.

## Verification

After `npm run build`, run `node scripts/serve-featured-preview.mjs` and, in another terminal, `node scripts/verify-featured.mjs`. If Playwright's bundled Chromium is unavailable but Chrome is installed, use `PLAYWRIGHT_CHANNEL=chrome node scripts/verify-featured.mjs`.

The static server emulates the explicit `/featured` Vercel rewrite, which Vite's built-in preview does not honor. Pass a deployment URL as the verification script's first argument to test hosted routing and metadata as well. It checks player activation and the external fallback; successful video streaming itself remains subject to YouTube's availability and automated-browser restrictions.
