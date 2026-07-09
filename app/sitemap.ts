import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { transactionPaths } from "@/lib/checklists";

/**
 * sitemap.xml — every public, indexable page. Staff, dealer, and check-in status
 * (token) routes are deliberately excluded; they're private and disallowed in
 * robots.ts. Absolute URLs are built from NEXT_PUBLIC_SITE_URL.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticPaths: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/services", changeFrequency: "monthly", priority: 0.8 },
    { path: "/pricing", changeFrequency: "monthly", priority: 0.7 },
    { path: "/forms", changeFrequency: "yearly", priority: 0.6 },
    { path: "/check-in", changeFrequency: "weekly", priority: 0.7 },
    // The public dealer-program pitch page (marketing), at /for-dealers. The
    // /dealers/* tree is the private portal, excluded here and disallowed in
    // robots.ts; bare /dealers 301-redirects here.
    { path: "/for-dealers", changeFrequency: "monthly", priority: 0.7 },
  ];

  // Deep SEO / FAQ landing pages, one per transaction. Higher priority than a
  // thin index entry because these are the pages built to rank and convert.
  const servicePaths = transactionPaths.map((path) => ({
    path: `/services/${path.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticPaths, ...servicePaths].map(
    ({ path, changeFrequency, priority }) => ({
      url: `${SITE_URL}${path}`,
      lastModified,
      changeFrequency,
      priority,
    }),
  );
}
