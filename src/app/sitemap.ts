import type { MetadataRoute } from "next";
import { LEGAL_LINKS, LEGAL_UPDATED, SITE } from "@/lib/site";

/**
 * Served as /sitemap.xml. Lists the pages worth indexing; /sets is left out
 * because it only shows sets saved in the visitor's own browser.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string) => new URL(path, SITE.url).href;
  return [
    { url: page("/") },
    { url: page("/create") },
    { url: page(LEGAL_LINKS.privacy), lastModified: LEGAL_UPDATED.iso },
    { url: page(LEGAL_LINKS.terms), lastModified: LEGAL_UPDATED.iso },
  ];
}
