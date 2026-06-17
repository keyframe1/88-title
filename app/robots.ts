import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * robots.txt — crawl the public marketing/self-service pages, keep private and
 * token-bearing routes out of the index:
 *   - /staff/        staff-only queue console (auth)
 *   - /dealers/      dealer portal (auth)
 *   - /check-in/status/  per-customer status pages keyed by a capability token
 *                        in the URL — must never be crawled or indexed
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/staff/", "/dealers/", "/check-in/status/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
