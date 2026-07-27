## Goal

Make every indexable page correctly canonicalised on `https://www.jobghost.io`, ship that metadata in static HTML, and steer organic visitors into a free scan before any subscription ask — without touching scan, auth, or payment logic.

---

## P0 — Technical SEO

**Canonical host**
- Change `SITE_ORIGIN` in `src/lib/seo.ts` from `https://jobghost.io` to `https://www.jobghost.io`. Every canonical, `og:url`, JSON-LD `url`/`@id`, logo, and download URL derives from this constant, so they all move together.
- Update `src/lib/authRedirect.ts` `CANONICAL_APP_ORIGIN` to the www host so verification links stay on the canonical domain.
- Leave the non-www → www redirect alone (it lives at the DNS/Vercel layer, untouched).

**Remove duplicate head tags**
- Strip `<link rel="canonical">`, `<meta name="description">`, and the `og:url`/`og:title`/`og:description`/`twitter:*` block from `index.html`, leaving only charset, viewport, favicon, a fallback `<title>`, and `og:image`/`og:type`. Route-level `SEO.tsx` becomes the single source for canonical + description, so no page ever has two.

**Static HTML metadata (prerender)**
- Add a build-time prerender step so `/`, `/what-is-a-ghost-job`, `/ghost-jobs-on-linkedin`, `/how-trust-score-works`, `/contact`, `/privacy`, `/terms` are emitted as real HTML files with their canonical/description/og/JSON-LD baked in.
- Implementation: a `scripts/prerender.ts` run as a `postbuild` script that loads `dist/index.html` in headless Chromium against a local static server, waits for Helmet to settle, and writes `dist/<route>/index.html`. Route list is an explicit constant (7 routes, hard cap well under any output limit) — no per-record generation.
- App-only routes (`/dashboard*`, `/reset-password`, `*`) are excluded and continue to serve the SPA shell via the existing Vercel rewrite, which stays as-is.

**Sitemap**
- Rewrite `public/sitemap.xml` with www URLs only. No `<lastmod>` values (no authoritative per-page timestamp exists).
- Update the `Sitemap:` line in `public/robots.txt` to the www URL. No other robots/noindex changes.

---

## Homepage SEO + messaging

- New title/description exactly as specified, set in `src/pages/Index.tsx`.
- `src/components/HeroSection.tsx`: new headline, supporting copy, primary CTA **“Scan a LinkedIn job free”** (scrolls/focuses the existing inline JobScanner), secondary CTA **“Add GhostJob to Chrome”**, microcopy `3 free scans · no card · score is an estimate, not a verdict`.
- Sweep hero/features/FAQ copy for “fake”/“scam” absolutism and soften to “likely ghost job” / “signals”. Existing stats stay as-is (already sourced) — nothing new invented.
- Design tokens and layout unchanged.

---

## Activation & conversion

**AuthDialog (`src/components/AuthDialog.tsx`)**
- Default view becomes account-creation-first: primary button **“Create your free account — get 3 scans”**, with “Already have an account? Sign in” as the secondary path.
- Remove the optional Full Name field (verified optional — `signUpWithEmail` accepts it as `fullName?` and stores `""` when absent, so registration is unaffected).
- Keep email+password auth exactly as-is. No new providers. Google block stays commented out.

**Result explainability (`src/components/GhostScoreDisplay.tsx`)**
- Keep the existing score/band rendering; add a short limitation line (“an estimate based on public listing signals, not a verdict on the employer”) and a descriptive link to `/how-trust-score-works`.

**Contextual Pro prompts**
- Free-scan limit reached in `JobScanner` → “unlimited scans” message (replaces the current generic upgrade alert wording).
- Existing dashboard `ProUpgradeBanner` copy tuned to demonstrated need. Only features that already exist are named; tracker/weekly-report claims are added only where the feature already ships — otherwise omitted.

**Mobile**
- The Chrome CTA is de-emphasised below `sm` in favour of the web scanner (which already works on mobile). No “send link to desktop” feature — that needs email infrastructure not currently wired for transactional sends.

---

## Learning pages

For `/what-is-a-ghost-job`, `/ghost-jobs-on-linkedin`, `/how-trust-score-works` — additive edits, existing prose preserved:
- Answer-first summary block near the top (2–3 sentences + key-points list).
- Question-based `h2` headings and compact checklists/tables where the content already supports it.
- Contextual CTAs: “Check a LinkedIn listing” → homepage scanner, “See how the Trust Score works” → methodology page.
- Cross-links between the three pages and the homepage with descriptive anchor text.
- FAQ sections added only where the answer text is genuinely on the page; FAQPage schema mirrors visible text exactly. No aggregate ratings, no invented authors, no new statistics.
- `/how-trust-score-works` gains an explicit “What the score does and does not prove” section.
- `/ghost-job-checker` is **not** created this pass.

---

## Analytics

No analytics vendor is currently installed (no gtag, PostHog, Plausible, Vercel Analytics, or dataLayer anywhere in the project).

- Add `src/lib/analytics.ts`: a typed `track(event, props)` facade covering all 13 named events, with a no-op sink plus a documented single integration point (one function body to swap when a vendor is chosen).
- Wire call sites now so the events fire the moment a vendor is added: `organic_landing_view`, `cta_click`, `scan_started`, `scan_completed`, `result_viewed`, `signup_modal_opened`, `signup_completed`, `extension_store_clicked`, `free_scan_limit_reached`, `checkout_started`.
- `extension_installed`, `first_extension_scan`, `checkout_completed`, and `subscription_activated` are documented as requiring extension/webhook-side emission and are left as documented stubs.
- Payloads carry score band, signal count, CTA name/location/variant/device — never job URLs, emails, or user IDs.

---

## Technical notes

- Prerender adds `puppeteer`-class headless Chromium to the build. If the Vercel build image can’t run it, the fallback is `vite-plugin-prerender`; either way route metadata output is identical.
- Helmet still governs runtime metadata, so prerendered HTML and client navigation agree.
- No database, edge function, RLS, or Stripe changes.

## Verification before finishing

1. Grep the built `dist/` HTML for each route: exactly one `rel="canonical"` and one `meta[name="description"]`.
2. Confirm every canonical/`og:url`/JSON-LD/sitemap URL uses `https://www.jobghost.io`.
3. Run the existing vitest suite (`AuthContext.test.tsx` covers the redirect contract) and smoke the scan → auth → pricing → checkout paths in the preview.
4. Report changed files, remaining deployment actions (Vercel redeploy; verify www is the primary domain in the Lovable Cloud auth URL config), and anything deferred.
