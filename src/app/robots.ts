import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/talents", "/events", "/ladder", "/search"],
      disallow: ["/admin", "/api"]
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
    host: getSiteUrl()
  };
}
