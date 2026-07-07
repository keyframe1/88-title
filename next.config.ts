import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The DPSMV form generator reads the real OMV templates from /public with fs
  // at request time. Next's file tracing can't follow a process.cwd()-based path
  // on its own, so include the templates in the route's serverless bundle (they
  // would otherwise be missing on Vercel, where /public is served by the CDN and
  // is not on the function filesystem).
  outputFileTracingIncludes: {
    "/api/staff/forms": [
      "./public/14249283.pdf",
      "./public/18538728.pdf",
      "./public/18544277.pdf",
      // The fillable DPSMV 1806 lives with the public forms library; the staff
      // generator reads it server-side, so it must ride along in the bundle too.
      "./public/forms/dpsmv-1806-permission-to-process-transaction.pdf",
    ],
  },

  async redirects() {
    // "What to bring" folded into the per-transaction detail pages. The old
    // standalone /checklist route is kept alive only as a 301 for SEO / inbound
    // continuity: a bare hit lands on the one transaction selector (/services),
    // and a legacy deep link (/checklist?for=<slug>) lands on that transaction's
    // detail page, where the checklist is now the hero.
    return [
      {
        source: "/checklist",
        has: [{ type: "query", key: "for", value: "(?<slug>[^&]+)" }],
        destination: "/services/:slug",
        statusCode: 301,
      },
      {
        source: "/checklist",
        destination: "/services",
        statusCode: 301,
      },
    ];
  },

  async headers() {
    return [
      {
        // The service worker must never be served stale, or clients can get
        // stuck on an old worker (and old push/cache logic). updateViaCache:
        // "none" at registration covers most browsers; this is belt-and-braces.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        // The blank OMV form PDFs under /public/forms are duplicates of state
        // documents. The /forms HTML page is the one indexable asset for form
        // searches; the PDFs must not compete with it or get indexed as bare
        // landing pages, so serve them noindex. (robots still allows crawling so
        // the tag is seen; it is the index we are suppressing, not the fetch.)
        source: "/forms/:file*.pdf",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ];
  },
};

export default nextConfig;
