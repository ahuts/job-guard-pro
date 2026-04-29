export const SITE_ORIGIN = "https://jobghost.io";
export const SITE_NAME = "GhostJob";
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;
export const SUPPORT_EMAIL = "hello@jobghost.io";
export const PRIVACY_EMAIL = "privacy@jobghost.io";
export const LEGAL_EMAIL = "legal@jobghost.io";

export const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/ghostjob-ghost-job-detect/clbbopifmidceplphamfdfapgacgbhnd";

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_ORIGIN,
  logo: `${SITE_ORIGIN}/favicon.png`,
  email: SUPPORT_EMAIL,
  sameAs: [CHROME_STORE_URL],
};

export const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "GhostJob — Ghost Job Detector",
  applicationCategory: "BrowserApplication",
  applicationSubCategory: "BrowserExtension",
  operatingSystem: "Chrome",
  url: SITE_ORIGIN,
  downloadUrl: CHROME_STORE_URL,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  aggregateRating: undefined,
  description:
    "GhostJob is a Chrome extension that scans LinkedIn job postings for ghost-job signals — repost age, vague salaries, urgency pressure, applicant-count anomalies, and more — so you never waste time on fake listings again.",
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_ORIGIN,
  },
};

export function articleSchema(opts: {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_ORIGIN}${opts.path}`,
    },
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_ORIGIN },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_ORIGIN,
      logo: { "@type": "ImageObject", url: `${SITE_ORIGIN}/favicon.png` },
    },
  };
}

export function faqPageSchema(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answer },
    })),
  };
}

export function webPageSchema(opts: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: opts.name,
    description: opts.description,
    url: `${SITE_ORIGIN}${opts.path}`,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_ORIGIN },
  };
}
