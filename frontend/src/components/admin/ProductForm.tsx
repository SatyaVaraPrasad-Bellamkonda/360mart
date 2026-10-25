"use client";

import Link from "next/link";
import { useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { FormMessage } from "@/components/auth/AuthCard";
import { SubmitButton, TextAreaField, TextField } from "@/components/auth/AuthFields";
import { ShopProductCard } from "@/components/catalog/ShopProductCard";
import { RichTextField } from "@/components/RichTextField";
import { saveProductAction } from "@/lib/catalog/product-actions";
import { PRODUCT_LIMITS, productErrors, productSlug, shopProductPath, toProductInput } from "@/lib/catalog/product-validation";
import { productDescription, productTitle } from "@/lib/catalog/seo";
import type { Product, ProductDraft, ProductErrors, ProductField, ProductVariant } from "@/lib/catalog/types";
import { categoryImageError, slugFromName } from "@/lib/catalog/validation";
import { SITE } from "@/lib/site";
import { FoodTypePicker, GooglePreview, ImagePicker, Section, Toggle } from "./FormParts";
import { SubcategoryPicker, type PickerPlace, type PickerStart } from "./SubcategoryPicker";


type Props = {
  /** null = a new product. */
  productId: number | null;
  initial: ProductDraft;
  /** Categories, and the subcategories of the product's category (more load when another category is picked). */
  start: PickerStart;
  currentImageUrl: string | null;
  /** Its sizes (edit only), for the shop preview. */
  variants: ProductVariant[];
};

// Add / edit a product's details. Sizes are managed separately (they're saved
// one by one, and a new product gets them right after it's created).
export function ProductForm({ productId, initial, start, currentImageUrl, variants }: Props) {
  const { sessionExpired } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState(initial);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<ProductErrors>({});
  const [message, setMessage] = useState<ReactNode>(null);
  const [pending, startTransition] = useTransition();

  const isNew = productId === null;
  // Where it sits now: category + subcategory (for the web address, previews and links).
  const [where, setWhere] = useState<{ category: PickerPlace; subcategory: PickerPlace } | null>(() => {
    const category = start.categories.find((c) => c.categoryId === start.categoryId);
    const subcategory = start.subcategories.find((c) => c.categoryId === initial.categoryId);
    return category && subcategory ? { category, subcategory } : null;
  });
  const place = where?.subcategory;
  const prefix = where ? `/${where.category.slug}/${where.subcategory.slug}/` : "/…/";
  const slug = productSlug(draft);
  const backHref = start.categoryId && initial.categoryId ? `/admin/products?category=${start.categoryId}&sub=${initial.categoryId}` : "/admin/products";

  const set = <K extends keyof ProductDraft>(key: K) => (value: ProductDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined, ...(key === "name" ? { slug: undefined } : {}) }));
  };

  function focusFirstError() {
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid=true], [data-invalid=true]")?.focus());
  }

  function save(event: FormEvent) {
    event.preventDefault();
    const found: ProductErrors = productErrors(draft);
    const imageProblem = image && categoryImageError(image);
    if (imageProblem) found.image = imageProblem;
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length) return focusFirstError();

    const form = new FormData();
    form.append("draft", JSON.stringify(draft));
    form.append("parentCategoryId", String(where?.category.categoryId ?? "")); // to come back to the right list
    if (image) form.append("image", image);
    startTransition(async () => {
      // On success the action moves on (to the sizes, or back to the list).
      const res = await saveProductAction(productId, form);
      if (!res || res.ok) return;
      const { code, fieldErrors } = res.error;
      if (code === "UNAUTHENTICATED") return sessionExpired();
      const known = Object.fromEntries(Object.entries(fieldErrors).filter(([field]) => FIELDS.has(field as ProductField)));
      if (Object.keys(known).length) {
        setErrors(known);
        setMessage(code === "VALIDATION_FAILED" ? "Please fix the highlighted fields." : null);
        return focusFirstError();
      }
      if (code === "PRODUCT_NOT_FOUND") {
        return setMessage(
          <>
            This product no longer exists.{" "}
            <Link href="/admin/products" className="font-semibold underline">
              Back to products
            </Link>
          </>,
        );
      }
      setMessage(res.error.message);
    });
  }

  const slugHint = draft.slug.trim()
    ? !isNew && draft.slug.trim() !== initial.slug
      ? "Changing it changes the product page's web address: old links stop working."
      : undefined
    : slugFromName(draft.name, PRODUCT_LIMITS.slug)
      ? `Leave empty to use "${slugFromName(draft.name, PRODUCT_LIMITS.slug)}".`
      : "Leave empty to make it from the name.";

  // What the shop card will look like, from the form as it is now.
  const previewProduct: Product = {
    ...toProductInput(draft),
    productId: productId ?? 0,
    slug: slug ?? "",
    name: draft.name.trim() || "Product name",
    imageUrl: preview ?? currentImageUrl,
    variants: variants.filter((v) => v.isActive),
    createdAt: "",
    updatedAt: "",
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px] lg:items-start">
      <form ref={formRef} onSubmit={save} noValidate className="min-w-0 space-y-5">
        <Section title="Basics">
          <SubcategoryPicker
            start={start}
            value={draft.categoryId}
            onChange={(choice) => {
              setWhere(choice);
              set("categoryId")(choice?.subcategory.categoryId ?? 0);
            }}
            hint={isNew ? "Where shoppers find it, like Fruits › Mangoes." : "Changing it moves the product to another subcategory."}
            error={errors.categoryId}
          />
          <TextField
            label="Name"
            name="name"
            autoComplete="off"
            maxLength={PRODUCT_LIMITS.name}
            placeholder="Alphonso Mango"
            value={draft.name}
            onChange={set("name")}
            error={errors.name}
            autoFocus={isNew && !!draft.categoryId}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Brand" name="brand" autoComplete="off" optional maxLength={PRODUCT_LIMITS.brand} placeholder="Ratnagiri Farms" value={draft.brand} onChange={set("brand")} error={errors.brand} />
            <TextField
              label="Web address (slug)"
              name="slug"
              autoComplete="off"
              optional
              prefix={prefix}
              maxLength={PRODUCT_LIMITS.slug}
              placeholder={slugFromName(draft.name, PRODUCT_LIMITS.slug) ?? "alphonso-mango"}
              value={draft.slug}
              onChange={(v) => set("slug")(v.toLowerCase().replace(/\s+/g, "-"))}
              error={errors.slug}
              hint={slugHint}
            />
          </div>
          <TextField
            label="Short description"
            name="shortDescription"
            autoComplete="off"
            optional
            maxLength={PRODUCT_LIMITS.shortDescription}
            placeholder="Sweet, juicy Ratnagiri Alphonso"
            value={draft.shortDescription}
            onChange={set("shortDescription")}
            error={errors.shortDescription}
            hint="One line on the product card."
          />
          <RichTextField
            label="Description"
            name="description"
            optional
            rows={6}
            maxLength={PRODUCT_LIMITS.description}
            placeholder={"Hand-picked from **Ratnagiri** orchards…\n- Naturally ripened\n- No carbide"}
            value={draft.description}
            onChange={set("description")}
            error={errors.description}
            hint="Shown on the product page."
          />
        </Section>

        <Section title="Picture">
          <ImagePicker
            currentUrl={currentImageUrl}
            file={image}
            onFile={(file) => {
              setImage(file);
              setErrors((e) => ({ ...e, image: file ? categoryImageError(file) : undefined }));
            }}
            onPreview={setPreview}
            error={errors.image}
          />
        </Section>

        <Section title="Food and freshness">
          <FoodTypePicker value={draft.foodType} onChange={set("foodType")} error={errors.foodType} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Origin" name="origin" autoComplete="off" optional maxLength={PRODUCT_LIMITS.origin} placeholder="Ratnagiri, Maharashtra" value={draft.origin} onChange={set("origin")} error={errors.origin} />
            <TextField label="Best season" name="bestSeason" autoComplete="off" optional maxLength={PRODUCT_LIMITS.bestSeason} placeholder="April - June" value={draft.bestSeason} onChange={set("bestSeason")} error={errors.bestSeason} />
          </div>
          <RichTextField
            label="Shelf life"
            name="shelfLife"
            optional
            rows={3}
            maxLength={PRODUCT_LIMITS.shelfLife}
            placeholder={"**Refrigerated:** 2 to 3 days\n**Frozen:** Up to 6 months (at -18°C)"}
            previewClassName="text-sm font-medium leading-relaxed text-ink"
            value={draft.shelfLife}
            onChange={set("shelfLife")}
            error={errors.shelfLife}
            hint="One line per storage condition, e.g. Refrigerated: 2 to 3 days. Stores can set their own."
          />
          <RichTextField
            label="Storage tip"
            name="storageTip"
            optional
            rows={3}
            maxLength={PRODUCT_LIMITS.storageTip}
            placeholder="Keep at room temperature until ripe, then **refrigerate**."
            value={draft.storageTip}
            previewClassName="leading-relaxed text-ink/75"
            onChange={set("storageTip")}
            error={errors.storageTip}
          />
          <Toggle label="In season now" hint="Shows an In season tag in the shop." checked={draft.isInSeason} onChange={set("isInSeason")} />
        </Section>

        <Section title="Display">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Badge"
              name="badgeLabel"
              autoComplete="off"
              optional
              maxLength={PRODUCT_LIMITS.badgeLabel}
              placeholder="Bestseller"
              value={draft.badgeLabel}
              onChange={set("badgeLabel")}
              error={errors.badgeLabel}
              hint="A short label on the card, like New."
            />
            <TextField
              label="Display order"
              name="displayOrder"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={draft.displayOrder}
              onChange={(v) => set("displayOrder")(v.replace(/\D/g, ""))}
              error={errors.displayOrder}
              hint="Lower numbers come first. Same number: A to Z."
            />
          </div>
          <Toggle label="Featured" hint="Shown in Featured picks on the home page and first on its category page." checked={draft.isFeatured} onChange={set("isFeatured")} />
          <Toggle
            label="Show in the shop"
            hint={draft.isActive ? "Shoppers can see it." : "Hidden from shoppers. It also drops out of the admin list for now, so you can't reopen it here yet."}
            warn={!draft.isActive}
            checked={draft.isActive}
            onChange={set("isActive")}
          />
        </Section>

        <Section title="Tax (GST)">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="HSN code"
              name="hsnCode"
              inputMode="numeric"
              autoComplete="off"
              optional
              maxLength={8}
              placeholder="0804"
              value={draft.hsnCode}
              onChange={(v) => set("hsnCode")(v.replace(/\D/g, ""))}
              error={errors.hsnCode}
              hint="4, 6 or 8 digits."
            />
            <TextField
              label="GST rate (%)"
              name="gstRate"
              inputMode="decimal"
              autoComplete="off"
              optional
              maxLength={5}
              placeholder="5"
              value={draft.gstRate}
              onChange={(v) => set("gstRate")(v.replace(/[^\d.]/g, ""))}
              error={errors.gstRate}
              hint="0 to 40, up to 2 decimals. Not shown to shoppers."
            />
          </div>
        </Section>

        <Section title="Search engines (SEO)">
          <TextField
            label="SEO title"
            name="seoTitle"
            autoComplete="off"
            optional
            maxLength={PRODUCT_LIMITS.seoTitle}
            placeholder={productTitle({ name: draft.name.trim() || "Alphonso Mango", seoTitle: null }, place?.name)}
            value={draft.seoTitle}
            onChange={set("seoTitle")}
            error={errors.seoTitle}
            hint={`${draft.seoTitle.length}/${PRODUCT_LIMITS.seoTitle} characters. Leave empty to use the name.`}
          />
          <TextAreaField
            label="SEO description"
            name="seoDescription"
            optional
            maxLength={PRODUCT_LIMITS.seoDescription}
            placeholder="Fresh Ratnagiri Alphonso mangoes from local stores in Hyderabad"
            value={draft.seoDescription}
            onChange={set("seoDescription")}
            error={errors.seoDescription}
            hint="Shown under the title in Google. Leave empty to use the short description."
          />
          <GooglePreview
            title={`${productTitle({ name: draft.name.trim() || "Product name", seoTitle: draft.seoTitle.trim() || null }, place?.name)} | ${SITE.name}`}
            url={`${SITE.url.replace(/^https?:\/\//, "")}${prefix}${slug ?? ""}`}
            description={productDescription(
              { name: draft.name.trim() || "this product", seoDescription: draft.seoDescription.trim() || null, shortDescription: draft.shortDescription.trim() || null, description: draft.description.trim() || null },
              place?.name,
            )}
          />
        </Section>

        <div aria-live="polite" className="empty:hidden">
          {message && <FormMessage error={message} />}
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          <Link href={backHref} className="flex min-h-12 items-center justify-center rounded-full px-6 font-semibold text-muted hover:text-ink">
            Cancel
          </Link>
          <div className="sm:ml-auto sm:w-64">
            <SubmitButton pending={pending} label={isNew ? "Add product, then sizes" : "Save details"} pendingLabel={image ? "Uploading…" : "Saving…"} />
          </div>
        </div>
      </form>

      {/* How it looks in the shop, as the admin types (large screens) */}
      <aside aria-label="Shop preview" className="hidden lg:sticky lg:top-24 lg:block">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Shop preview</p>
        <div inert className="pointer-events-none">
          <ShopProductCard product={previewProduct} href={where ? shopProductPath(where.category, where.subcategory, previewProduct) : "#"} context={place?.name} />
        </div>
        <p className="mt-2 text-xs text-muted">{variants.length ? "Sizes as saved." : "Sizes appear once you add them."}</p>
      </aside>
    </div>
  );
}

const FIELDS = new Set<ProductField>([
  "categoryId", "name", "slug", "brand", "shortDescription", "description", "foodType", "origin", "bestSeason", "storageTip",
  "shelfLife", "isInSeason", "badgeLabel", "hsnCode", "gstRate", "seoTitle", "seoDescription", "displayOrder", "isFeatured", "isActive", "image",
]);
