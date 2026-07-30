import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/shared";
import { source } from "@/lib/source";

export const dynamic = "force-static";

// siteUrl already carries the base path, and page.url is root relative, so they concatenate.
// the trailing slash matches what the export actually serves
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = source.getPages().map((page) => ({
    url: `${siteUrl}${page.url}/`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: `${siteUrl}/`,
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    ...pages,
  ];
}
