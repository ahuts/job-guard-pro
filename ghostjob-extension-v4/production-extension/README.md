# GhostJob production extension candidate 1.3.11

This folder is a prepared Chrome Web Store update candidate. It is **not published**.
The unpacked pilot remains in the sibling `ghostjob-extension/` folder and points to
the Preview API. This candidate points only to `https://www.jobghost.io/api/scan`.

Before submission, deploy and verify the compatible production backend. Its
authenticated `GET /api/scan` capability response chooses scoring v3 only for
allowlisted signed-in pilots; other accounts receive v2. The production extension
checks that response before each scan and rejects an unsupported backend without
counting the scan. The public Trust Score remains explainable, and the Jev result
remains private. Unlike the Preview build, signed-in users may save a scan to
their dashboard under the existing RLS policies.

The Store update needs its own review after backend verification and the frozen
24-case benchmark. Do not submit this folder as-is while `www.jobghost.io` still
returns API v1.0.0 or while the benchmark gate remains open. Package only the
extension runtime files and icons; exclude screenshots, README, status notes,
dotfiles, and AppleDouble files.
