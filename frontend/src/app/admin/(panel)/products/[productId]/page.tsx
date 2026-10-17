import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminLoadFailed, AdminPageHeader, PRIMARY_BUTTON } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";
import { VariantManager } from "@/components/admin/VariantManager";
import { FormMessage } from "@/components/auth/AuthCard";
import { CategoryImage } from "@/components/catalog/CategoryImage";
import { requireRole } from "@/lib/auth/dal";
import { getSessionToken } from "@/lib/auth/session";
import { productsUrl } from "@/components/admin/picker-place";
import { loadProducts } from "@/lib/catalog/data";
import { listVariants } from "@/lib/catalog/product-service";
import { shopProductPath, toProductDraft } from "@/lib/catalog/product-validation";
import { parseCategoryId } from "@/lib/catalog/validation";
import { CategoryFormSkeleton } from "../../categories/CategoryFormSkeleton";
import { loadPicker } from "../picker";

export const metadata: Metadata = { title: "Edit product" };

type Props = PageProps<"/admin/products/[productId]">;

// One product: its sizes first (quick to change), then its details.
// ?category=&sub= say where it sits (needed to find it: there's no get-one endpoint); ?saved=added right after creating it.
export default function EditProductPage({ params, searchParams }: Props) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Suspense fallback={<CategoryFormSkeleton />}>
        <EditProduct params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function EditProduct({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  await requireRole("admin");
  const [{ productId: raw }, { category: categoryParam, sub, saved }, token] = await Promise.all([params, searchParams, getSessionToken()]);
  const header = <AdminPageHeader crumbs={[{ name: "Products", href: "/admin/products" }]} title="Edit product" />;

  // There's no "get one product" endpoint, so the product is found in its
  // subcategory's list: the link carries ?category= and ?sub= (one call each).
  const picker = await loadPicker(categoryParam, sub);
  if (!picker.ok) return <>{header}<AdminLoadFailed message={picker.error.message} /></>;
  const { start, category, subcategory } = picker;
  const id = parseCategoryId(raw);
  const list = category && subcategory && id !== null ? await loadProducts(subcategory.categoryId) : null;
  if (list && !list.ok) return <>{header}<AdminLoadFailed message={list.error.message} /></>;
  const product = list?.ok ? list.data.find((p) => p.productId === id) : undefined;
  if (!product || !category || !subcategory) {
    return (
      <>
        {header}
        <div className="rounded-3xl border border-line bg-white px-5 py-6">
          <p className="font-semibold text-ink">This product can&apos;t be opened from this link.</p>
          <p className="mt-1 text-sm text-muted">Open it from the Products list. It may also be hidden from the shop (hidden products can&apos;t be opened here yet).</p>
          <Link href="/admin/products" className={`mt-4 w-fit ${PRIMARY_BUTTON}`}>
            Back to products
          </Link>
        </div>
      </>
    );
  }

  // Every size, hidden ones too (the shop list leaves those out).
  const variants = token ? await listVariants(token, product.productId) : null;
  const shopHref = shopProductPath(category, subcategory, product);

  return (
    <>
      <AdminPageHeader
        crumbs={[{ name: "Products", href: productsUrl(category.categoryId, subcategory.categoryId) }]}
        title={product.name}
        subtitle={`${category.name} › ${subcategory.name}`}
        action={
          (
            <a href={shopHref} target="_blank" rel="noopener" className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-ink">
              <ExternalLink aria-hidden className="size-4" />
              View in shop
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )
        }
      />
      {saved === "added" && <FormMessage notice={`${product.name} is added. Now add the sizes it's sold in.`} />}

      <div className="flex items-center gap-3 rounded-3xl bg-white p-3 ring-1 ring-line sm:hidden">
        <CategoryImage src={product.imageUrl} alt="" className="size-14 shrink-0 rounded-2xl ring-1 ring-line" />
        <p className="min-w-0 break-words text-sm text-muted">{product.shortDescription ?? "Add a short description so the card reads well."}</p>
      </div>

      {variants && variants.ok ? (
        // Not keyed by the sizes: after a size is saved the list refreshes in place and keeps its "saved" message.
        <VariantManager productId={product.productId} productName={product.name} variants={variants.data} startAdding={saved === "added"} />
      ) : (
        <AdminLoadFailed message={variants && !variants.ok ? variants.error.message : "Please login to continue."} />
      )}

      <h2 className="pt-2 text-lg font-extrabold text-ink">Details</h2>
      <ProductForm
        // Fresh form after a save (here or by another admin).
        key={`${product.productId}@${product.updatedAt}`}
        productId={product.productId}
        initial={toProductDraft(product)}
        start={start}
        currentImageUrl={product.imageUrl}
        variants={variants && variants.ok ? variants.data : product.variants}
      />
    </>
  );
}
