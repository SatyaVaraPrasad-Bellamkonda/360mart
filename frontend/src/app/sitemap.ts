import type { MetadataRoute } from "next";
import { LIVE_CATEGORIES } from "@/lib/categories";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE.url, changeFrequency: "daily", priority: 1 },
    ...LIVE_CATEGORIES.map((category) => ({
      url: `${SITE.url}/${category.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
  ];
}
