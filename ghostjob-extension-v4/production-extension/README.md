# GhostJob production extension candidate 1.3.12

This folder is the follow-up Chrome Web Store update candidate. It is **not published**.
The unpacked pilot remains in the sibling `ghostjob-extension/` folder and points to
the Preview API. This candidate points only to `https://www.jobghost.io/api/scan`.

This version requires sign-in before scanning and displays the account's Free
allowance from `GET /api/scan`. The server enforces three distinct successful
Free checks per UTC month across the website and extension; local scan history
does not decide eligibility. Pro accounts have unlimited standard checks and
deeper investigation when available. The API remains compatible with 1.3.11
until 1.3.12 is approved and published.

Package only the extension runtime files and icons; exclude screenshots,
README, status notes, dotfiles, and AppleDouble files. After this version is
approved and published, enable the server-side sign-in requirement for
extension scans. Older clients must receive an update-and-sign-in message.
