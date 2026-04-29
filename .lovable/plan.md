## SEO/AEO implementation plan for jobghost.io

I've worked through the audit and grouped the work into the same priority tiers it uses. Below is what I'll ship, in order, plus the tradeoffs you should know about before I touch anything structural.

### Tradeoff to flag up front: rendering model

The audit's #1 finding is "the site is client-rendered, prefer SSR/pre-render." This project is a Vite + React SPA on Vercel. Moving to true SSR would mean migrating to Next.js, which is a large rewrite and out of scope for this pass.

**What I'll do instead** (delivers most of the SEO benefit without a rewrite):
- Use `react-helmet-async` to set per-route `<title>`, meta description, canonical, OG, Twitter, and JSON-LD tags at runtime. Googlebot renders JS reliably, so this captures route-level metadata correctly.
- Add a static `public/sitemap.xml` and reference it from `robots.txt`.
- Keep the door open for a future pre-render step (e.g. `vite-plugin-prerender`) — the metadata system I build will work either way.

If you want full static pre-rendering or a Next.js migration, say the word and I'll scope it as a separate plan.

---

### Tier 1 — Quick wins (this batch)

**1. Per-route metadata system**
- Add `react-helmet-async` and an `<SEO />` component that sets title, description, canonical (using `https://jobghost.io` as the canonical origin), OG, Twitter, and optional JSON-LD.
- Wrap the app in `HelmetProvider` in `App.tsx`.
- Apply unique metadata to: `/`, `/privacy`, `/terms`, `/contact`, and the 3 new educational pages.
- Remove the static `<title>` / meta from `index.html` so route-level tags win cleanly (keep a sensible fallback).

**2. Fix navigation and footer on non-home pages**
- Update `Navbar` so `Features / How It Works / Pricing` always link to `/#features`, `/#how-it-works`, `/#pricing` (absolute hashes that route home + scroll), not page-local hashes.
- Update `Footer`: replace dead `Contact` `href="#"` with `/contact`.
- Add a small `useScrollToHash` effect on the homepage so cross-page hash links scroll to the right section after navigation.

**3. Standardize entity/contact identity**
- Replace `legal@ghostjob.app` in `TermsOfService.tsx` with `legal@jobghost.io` (matches privacy contact and the live domain).
- Add a "Last reviewed / Effective date" line to both legal pages.

**4. Add cited statistics on the homepage**
- Under the "43% of job postings are fake" stat in the hero (and any similar claims in `SocialProofSection`), add small inline source links + tooltips referencing the source articles cited in the audit (Built In, AIHR, FTC/BBB).
- Style as muted superscript-style links so it doesn't clutter the hero.

**5. Homepage FAQ section**
- New `FAQSection` component inserted between `HowItWorks` and `Pricing`.
- Six questions pulled from the audit:
  - What is a ghost job?
  - How does GhostJob calculate the Trust Score?
  - What signals does GhostJob use?
  - Does GhostJob work only on LinkedIn?
  - Is my LinkedIn data sent anywhere?
  - Can GhostJob tell if a job is a scam or just stale?
- Uses the existing `Accordion` UI primitive. Emits `FAQPage` JSON-LD via the `<SEO />` component.

**6. Contact page**
- Lightweight `/contact` route with a `mailto:hello@jobghost.io` CTA, support address, and a short "what to expect" blurb. Linked from footer and nav. (No form backend — keeps scope tight; can be upgraded later.)

**7. Sitemap + canonicals + robots**
- Add `public/sitemap.xml` listing `/`, `/privacy`, `/terms`, `/contact`, and the new educational pages.
- Update `public/robots.txt` to reference the sitemap.
- Self-referencing canonicals come for free via the `<SEO />` component.

---

### Tier 2 — Structured data (same batch)

JSON-LD blocks emitted via the `<SEO />` component:
- Homepage: `Organization`, `SoftwareApplication` (with category=BrowserExtension, OS=Chrome, free offer), and `FAQPage` from the FAQ section.
- Educational pages: `Article` with headline, datePublished, author=GhostJob.
- Legal/contact pages: `WebPage` + `Organization`.

---

### Tier 3 — Educational content cluster (3 pages this pass)

Per the audit's "Definition of done" (≥3 new educational pages, interlinked):

**`/what-is-a-ghost-job`** — definition, why companies post them, common red flags, ghost-job-vs-scam mini comparison table, CTA to install extension.

**`/ghost-jobs-on-linkedin`** — LinkedIn-specific signals (reposts, applicant counts, posting age, vague descriptions), when to verify manually, CTA to install extension.

**`/how-ghostjob-trust-score-works`** — signal categories, what each score range means (e.g. 0–30 high risk, 30–70 caution, 70–100 likely legit), worked example, limitations/disclaimer.

Each page:
- Reuses `Navbar` + `Footer`.
- Has answer-first opening paragraph (the definition/answer in the first 60 words for AEO extractability).
- Has its own `<SEO />` block (unique title, description, canonical, `Article` JSON-LD).
- Cross-links to the other two educational pages and back to the homepage features/pricing.
- Ends with the same Chrome install CTA used in the hero.

Homepage gets contextual links into these pages (under FAQ answers and the features section).

The two additional pages from the audit (`/how-to-spot-fake-job-postings`, `/ghost-job-vs-job-scam`) and `/linkedin-job-red-flags` are intentionally deferred to a follow-up pass to keep this batch reviewable. The metadata + content system I'm building makes adding them later a small lift.

---

### Files I'll touch / create

Edits:
- `src/App.tsx` — add `HelmetProvider`, register new routes.
- `index.html` — slim down static head tags so per-route tags win.
- `src/components/Navbar.tsx` — absolute-hash links, add educational links to mobile/desktop menus where it fits.
- `src/components/Footer.tsx` — fix Contact link, add educational links column.
- `src/components/TermsOfService.tsx` — fix contact email, add effective date.
- `src/components/PrivacyPolicy.tsx` — add summary box + effective date.
- `src/pages/Index.tsx` — insert FAQ section, add hash-scroll handler.
- `src/components/HeroSection.tsx` / `SocialProofSection.tsx` — cited stats.
- `public/robots.txt` — sitemap reference.

New files:
- `src/components/SEO.tsx` — Helmet wrapper with JSON-LD support.
- `src/lib/seo.ts` — site constants (canonical origin, org schema).
- `src/components/FAQSection.tsx`
- `src/pages/Contact.tsx`
- `src/pages/WhatIsAGhostJob.tsx`
- `src/pages/GhostJobsOnLinkedIn.tsx`
- `src/pages/HowTrustScoreWorks.tsx`
- `public/sitemap.xml`

New dep: `react-helmet-async`.

### What I'm explicitly NOT doing in this pass

- No Next.js migration / true SSR (called out above).
- No comparison pages (`/ghostjob-vs-trouvr`, etc.) — audit recommends waiting until more product proof exists.
- No contact form backend — `/contact` ships with mailto only.
- No changes to authenticated dashboard routes or any existing functionality.

### Definition of done for this PR

- Every public route has unique title, description, canonical, OG, Twitter tags.
- `sitemap.xml` is live and referenced from `robots.txt`.
- Homepage has a FAQ section + cited statistics + `FAQPage` + `SoftwareApplication` + `Organization` JSON-LD.
- Legal pages no longer have dead nav/footer links and use a consistent `jobghost.io` email.
- `/contact` exists and is reachable from nav + footer.
- 3 new educational pages are live, interlinked with each other and the homepage, and emit `Article` JSON-LD.
- All existing flows (auth, scanner, dashboard, pricing, Chrome CTA) continue to work unchanged.
