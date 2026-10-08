import Link from "next/link";
import { SITE } from "@/lib/site";
import { JsonLd } from "./JsonLd";

export type Crumb = { name: string; href: string };

// Visible breadcrumb trail plus BreadcrumbList data so Google can show the
// path (Home › Fruits › Mangoes) in search results. The last crumb is the
// current page.
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const trail = [{ name: "Home", href: "/" }, ...items];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: trail.map((crumb, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: crumb.name,
            item: `${SITE.url}${crumb.href === "/" ? "" : crumb.href}`,
          })),
        }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          {trail.map((crumb, i) => {
            const isLast = i === trail.length - 1;
            return (
              <li key={crumb.href} className="flex items-center gap-1.5">
                {isLast ? (
                  <span aria-current="page" className="font-medium text-ink">
                    {crumb.name}
                  </span>
                ) : (
                  <>
                    <Link href={crumb.href} className="hover:text-ink hover:underline">
                      {crumb.name}
                    </Link>
                    <span aria-hidden>›</span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
