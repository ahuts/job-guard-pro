/**
 * Post-build prerender step.
 *
 * The app is a client-rendered SPA, so per-route head tags rendered by
 * react-helmet-async are only visible to crawlers that execute JavaScript.
 * This script copies dist/index.html to a static file per indexable route and
 * injects that route's title/description/canonical/og tags + JSON-LD, so
 * non-JS crawlers (social previews, answer engines) see the right metadata.
 *
 * Keep the ROUTES list in sync with src/App.tsx and public/sitemap.xml.
 * Capped well below Lovable's publish limits — this is a small fixed list.
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const SITE_ORIGIN = "https://www.jobghost.io";
const SITE_NAME = "GhostJob";
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;
const MAX_PRERENDER_PAGES = 50;

interface Route {
  path: string;
  title: string;
  description: string;
  type?: "website" | "article";
}

const ROUTES: Route[] = [
  {
    path: "/",
    title: "GhostJob — Free LinkedIn Ghost Job Checker | Scan a Listing",
    description:
      "Paste a LinkedIn job URL to spot reposts, stale listings, vague pay, and generic copy before you apply. Get 3 free scans — no card required.",
  },
  {
    path: "/what-is-a-ghost-job",
    title: "What Is a Ghost Job? Definition, Red Flags & Examples | GhostJob",
    description:
      "A ghost job is a public listing that isn't tied to active hiring. Learn why companies post them, the most common red flags, and how ghost jobs differ from job scams.",
    type: "article",
  },
  {
    path: "/ghost-jobs-on-linkedin",
    title: "Ghost Jobs on LinkedIn: How to Spot Them Before You Apply | GhostJob",
    description:
      "LinkedIn-specific ghost-job signals: reposted listings, applicant-count anomalies, posting age, vague descriptions, and when to verify a recruiter manually.",
    type: "article",
  },
  {
    path: "/how-trust-score-works",
    title: "How the GhostJob Trust Score Works",
    description:
      "The GhostJob Trust Score combines 10+ ghost-job signals into a single 0–100 number. See the signal categories, what each score range means, a worked example, and the limitations.",
    type: "article",
  },
  {
    path: "/contact",
    title: "Contact GhostJob",
    description:
      "Questions about ghost job detection, the Chrome extension, billing, or privacy? Reach the GhostJob team.",
  },
  {
    path: "/privacy",
    title: "Privacy Policy | GhostJob",
    description:
      "How GhostJob collects, uses, and protects your data when you scan LinkedIn job listings.",
  },
  {
    path: "/terms",
    title: "Terms of Service | GhostJob",
    description: "The terms that govern your use of GhostJob's website and Chrome extension.",
  },
];

function escapeAttr(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function headFor(route: Route) {
  const url = `${SITE_ORIGIN}${route.path}`;
  const title = escapeAttr(route.title);
  const description = escapeAttr(route.description);

  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:type" content="${route.type ?? "website"}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${DEFAULT_OG_IMAGE}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${DEFAULT_OG_IMAGE}" />`,
  ].join("\n    ");
}

const distDir = resolve("dist");
const template = readFileSync(resolve(distDir, "index.html"), "utf8");

// Strip the sitewide defaults so each route ships exactly one of each tag.
const stripped = template
  .replace(/\s*<title>[\s\S]*?<\/title>/gi, "")
  .replace(/\s*<meta\s+name="description"[^>]*>/gi, "")
  .replace(/\s*<link\s+rel="canonical"[^>]*>/gi, "")
  .replace(/\s*<meta\s+property="og:[^"]*"[^>]*>/gi, "")
  .replace(/\s*<meta\s+name="twitter:[^"]*"[^>]*>/gi, "");

const routes = ROUTES.slice(0, MAX_PRERENDER_PAGES);

for (const route of routes) {
  const html = stripped.replace("</head>", `  ${headFor(route)}\n  </head>`);
  const outDir = route.path === "/" ? distDir : resolve(distDir, `.${route.path}`);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "index.html"), html);
}

console.log(`prerendered ${routes.length} routes with static head metadata`);
