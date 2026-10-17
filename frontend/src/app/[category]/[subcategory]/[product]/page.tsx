import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductView } from "@/components/catalog/ProductView";
import { CatalogUnavailable, ShopPageSkeleton } from "@/components/catalog/ShopStates";
import { getShopProduct } from "@/lib/catalog/data";
import { productMetadata } from "@/lib/catalog/seo";

// The shared product page (/<category>/<subcategory>/<product>), for products
// added in the admin panel. There's no "get one product" endpoint, so it's
// found in its subcategory's (cached) list.

type Props = PageProps<"/[category]/[subcategory]/[product]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, subcategory, product } = await params;
  const loaded = await getShopProduct(category, subcategory, product);
  return productMetadata(loaded.ok ? loaded.data : null);
}

export default function ProductPage({ params }: Props) {
  return (
    <Suspense fallback={<ShopPageSkeleton />}>
      <ProductContent params={params} />
    </Suspense>
  );
}

async function ProductContent({ params }: Pick<Props, "params">) {
  const { category, subcategory, product } = await params;
  const loaded = await getShopProduct(category, subcategory, product);
  if (!loaded.ok) return <CatalogUnavailable message={loaded.error.message} />;
  if (!loaded.data) notFound();
  return <ProductView data={loaded.data} />;
}
