import { Helmet } from "react-helmet-async";
import { SITE_ORIGIN, SITE_NAME, DEFAULT_OG_IMAGE } from "@/lib/seo";

interface SEOProps {
  title: string;
  description: string;
  path: string; // e.g. "/", "/privacy"
  image?: string;
  noindex?: boolean;
  /** One or more JSON-LD objects */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  type?: "website" | "article";
}

export const SEO = ({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  noindex,
  jsonLd,
  type = "website",
}: SEOProps) => {
  const url = `${SITE_ORIGIN}${path}`;
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const ldArray = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {ldArray.map((ld, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(ld)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEO;
