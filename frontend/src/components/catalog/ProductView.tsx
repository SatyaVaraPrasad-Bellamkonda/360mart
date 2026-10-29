import { CalendarRange, Leaf, MapPin, Refrigerator } from "lucide-react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { RichText } from "@/components/RichText";
import { SectionHeading } from "@/components/SectionHeading";
import type { ShopSubcategory } from "@/lib/catalog/data";
import { foodTypeLabel, shopProductPath, sortVariants } from "@/lib/catalog/product-validation";
import { foodTheme } from "@/lib/catalog/food-theme";
import { productJsonLdFrom } from "@/lib/catalog/seo";
import type { Product } from "@/lib/catalog/types";
import { categoryPath } from "@/lib/catalog/validation";
import { seasonLabel } from "@/lib/catalog/season";
import { mapConfig } from "@/lib/maps/config";
import { CategoryBadge } from "./CategoryBadge";
import { CategoryImage } from "./CategoryImage";
import { FoodMark } from "./FoodMark";
import { ShopProductCard } from "./ShopProductCard";
import { StoreOffers } from "./StoreOffers";

const MORE_SHOWN = 8;

// The shared product page body (/<category>/<subcategory>/<product>) for
// products from the backend. The product itself comes from the cache; prices
// are per store and per location, so StoreOffers loads them live in the browser.
export function ProductView({ data }: { data: ShopSubcategory & { product: Product } }) {
  const { category, subcategory, product, products } = data;
  const subPath = categoryPath(subcategory, category);
  const sizes = sortVariants(product.variants);
  const theme = foodTheme(product.foodType);
  const more = products.filter((p) => p.productId !== product.productId).slice(0, MORE_SHOWN);
  const facts = [
    product.origin && { icon: MapPin, label: "Origin", value: product.origin },
    seasonLabel(product) && { icon: CalendarRange, label: product.alwaysInSeason ? "Season" : "Best season", value: seasonLabel(product)! },
  ].filter((f) => !!f);

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-5 sm:space-y-16 sm:py-6">
      <JsonLd data={productJsonLdFrom(product, category, subcategory)} />

      <div className="space-y-4">
        <Breadcrumbs
          items={[
            { name: category.name, href: categoryPath(category) },
            { name: subcategory.name, href: subPath },
            { name: product.name, href: shopProductPath(category, subcategory, product) },
          ]}
        />

        <div className="grid gap-6 md:grid-cols-2 md:gap-10">
          {/* Picture */}
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-surface ring-1 ring-line md:sticky md:top-24 md:self-start">
            <CategoryImage src={product.imageUrl} alt={product.name} priority className="size-full" iconClassName="size-20" />
            <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
              {product.badgeLabel ? <CategoryBadge label={product.badgeLabel} tone="onPhoto" className="max-w-[75%]" /> : <span />}
              {product.foodType && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-ink shadow-sm">
                  <FoodMark type={product.foodType} decorative />
                  {foodTypeLabel(product.foodType)}
                </span>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="min-w-0">
            <Link href={subPath} className={`-my-3 inline-block py-3 text-xs font-bold uppercase tracking-wider hover:underline ${theme.text}`}>
              {subcategory.name}
            </Link>
            <h1 className="mt-1 break-words text-3xl font-extrabold leading-tight tracking-tight text-ink motion-safe:animate-fade-up sm:text-4xl">{product.name}</h1>
            {product.brand && <p className="mt-1 text-sm font-semibold text-muted">by {product.brand}</p>}
            {product.isInSeason && (
              <p className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${theme.soft} ${theme.text}`}>
                <Leaf aria-hidden className="size-4" />
                In season now
              </p>
            )}
            {product.shortDescription && <p className="mt-4 break-words text-lg text-ink/80">{product.shortDescription}</p>}

            {/* Sizes, and the stores that deliver the chosen size to the shopper (live prices, never cached). */}
            <StoreOffers productId={product.productId} productName={product.name} imageUrl={product.imageUrl} foodType={product.foodType} href={shopProductPath(category, subcategory, product)} sizes={sizes.map((v) => ({ variantId: v.variantId, label: v.label, quantity: v.quantity, unit: v.unit }))} catalogShelfLife={product.shelfLife} theme={theme} map={mapConfig()} />

            {facts.length > 0 && (
              <dl className="mt-6 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
                {facts.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
                    <Icon aria-hidden className={`mt-0.5 size-5 shrink-0 ${theme.text}`} />
                    <div className="min-w-0">
                      <dt className="text-xs font-semibold text-muted">{label}</dt>
                      <dd className="break-words text-sm font-bold text-ink">{value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </div>

      {(product.description || product.storageTip) && (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr] lg:gap-6">
          {product.description && (
            <section aria-labelledby="about-heading" className="rounded-3xl bg-white p-5 ring-1 ring-line sm:p-8">
              <h2 id="about-heading" className="text-xl font-extrabold tracking-tight text-ink">
                About {product.name}
              </h2>
              <RichText text={product.description} className="mt-3 leading-relaxed text-muted" />
            </section>
          )}
          {product.storageTip && (
            <section aria-labelledby="storage-heading" className="rounded-3xl bg-sky-50 p-5 ring-1 ring-sky-100 sm:p-8 lg:self-start">
              <h2 id="storage-heading" className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-ink">
                <Refrigerator aria-hidden className="size-5 text-sky-700" />
                How to store it
              </h2>
              <RichText text={product.storageTip} className="mt-3 leading-relaxed text-ink/75" />
            </section>
          )}
        </div>
      )}

      {more.length > 0 && (
        <section aria-labelledby="more-heading">
          <SectionHeading id="more-heading" title={`More ${subcategory.name}`} subtitle="From the same aisle" />
          <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {more.map((p) => (
              <li key={p.productId} className="w-[46%] shrink-0 snap-start sm:w-auto">
                <ShopProductCard product={p} href={shopProductPath(category, subcategory, p)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
