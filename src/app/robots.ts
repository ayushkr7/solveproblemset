import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/** Served as /robots.txt. The API routes return JSON catalogs, not pages. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: new URL("/sitemap.xml", SITE.url).href,
  };
}
