import type { Metadata } from "next";

const DEFAULT_SITE_URL = "https://skill-deploy-mf0nplcd7f.vercel.app";

export function getSiteUrl() {
  const raw =
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : DEFAULT_SITE_URL);

  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export function buildAbsoluteUrl(path = "/") {
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildMetadata({
  title,
  description,
  path = "/"
}: {
  title: string;
  description: string;
  path?: string;
}): Metadata {
  return {
    title,
    description,
    metadataBase: new URL(getSiteUrl()),
    alternates: {
      canonical: buildAbsoluteUrl(path)
    },
    openGraph: {
      title,
      description,
      url: buildAbsoluteUrl(path),
      siteName: "TIANTI",
      type: "website",
      locale: "zh_CN"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description
    }
  };
}
