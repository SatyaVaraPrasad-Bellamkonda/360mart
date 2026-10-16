"use client";

import { Check, EyeOff, ImagePlus, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useId, useRef, useState, useTransition, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { FormMessage } from "@/components/auth/AuthCard";
import { FieldError, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/auth/AuthFields";
import { CategoryImage } from "@/components/catalog/CategoryImage";
import { saveCategoryAction } from "@/lib/catalog/actions";
import { categoryDescription, categoryTitle } from "@/lib/catalog/seo";
import type { CategoryDraft, CategoryErrors, CategoryField } from "@/lib/catalog/types";
import { CATEGORY_IMAGE_TYPES, CATEGORY_LIMITS, CUSTOM_CATEGORY_PAGES, categoryErrors, categoryImageError, effectiveSlug, slugFromName } from "@/lib/catalog/validation";
import { SITE } from "@/lib/site";

export type ParentOption = { categoryId: number; name: string; slug: string };

type Props = {
  /** null = a new category. */
  categoryId: number | null;
  initial: CategoryDraft;
  /** Top-level categories it can go under (never itself). */
  parents: ParentOption[];
  /** Picture saved now (edit only). */
  currentImageUrl: string | null;
  /** Editing a top-level category that has subcategories: it can't move under another one. */
  childCount: number;
};

const TOP_LEVEL = "";

// Add / edit a category or subcategory. Checked here for instant feedback,
// again by the server action, and by the backend, whose messages appear under
// the field they belong to.
export function CategoryForm({ categoryId, initial, parents, currentImageUrl, childCount }: Props) {
  const { sessionExpired } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState(initial);
  const [image, setImage] = useState<File | null>(null);
  const [errors, setErrors] = useState<CategoryErrors>({});
  const [message, setMessage] = useState<ReactNode>(null);
  const [pending, startTransition] = useTransition();

  const parent = parents.find((p) => p.categoryId === draft.parentCategoryId) ?? null;
  const slug = effectiveSlug(draft);
  const isNew = categoryId === null;
  const kind = draft.parentCategoryId === null ? "category" : "subcategory";

  const set = <K extends keyof CategoryDraft>(key: K) => (value: CategoryDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    // Fixing a field clears its error at once (the parent decides the slug's level too).
    setErrors((e) => ({ ...e, [key]: undefined, ...(key === "parentCategoryId" || key === "name" ? { slug: undefined } : {}) }));
  };

  function focusFirstError() {
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
  }

  function save(event: FormEvent) {
    event.preventDefault();
    const found: CategoryErrors = categoryErrors(draft);
    const imageProblem = image && categoryImageError(image);
    if (imageProblem) found.image = imageProblem;
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length) return focusFirstError();

    const form = new FormData();
    form.append("draft", JSON.stringify(draft));
    if (image) form.append("image", image);
    startTransition(async () => {
      // On success the action goes back to the category list.
      const res = await saveCategoryAction(categoryId, form);
      if (!res || res.ok) return;
      const { code, fieldErrors } = res.error;
      if (code === "UNAUTHENTICATED") return sessionExpired();
      const known = Object.fromEntries(Object.entries(fieldErrors).filter(([field]) => FIELDS.has(field as CategoryField)));
      if (Object.keys(known).length) {
        setErrors(known);
        // Conflicts like "name taken" explain themselves next to the field.
        setMessage(code === "VALIDATION_FAILED" ? "Please fix the highlighted fields." : null);
        return focusFirstError();
      }
      if (code === "CATEGORY_NOT_FOUND") {
        return setMessage(
          <>
            This category no longer exists or is hidden.{" "}
            <Link href="/admin/categories" className="font-semibold underline">
              Back to categories
            </Link>
          </>,
        );
      }
      setMessage(res.error.message);
    });
  }

  const parentLocked = !isNew && initial.parentCategoryId === null && childCount > 0;
  const prefix = parent ? `/${parent.slug}/` : "/";
  const ownPage = draft.parentCategoryId === null && slug !== null && CUSTOM_CATEGORY_PAGES.has(slug);
  const slugHint = draft.slug.trim()
    ? !isNew && draft.slug.trim() !== initial.slug
      ? "Changing it changes the page's web address: old links to it stop working."
      : ownPage
        ? `This category uses its own designed page at /${slug}.`
        : undefined
    : slugFromName(draft.name)
      ? `Leave empty to use "${prefix}${slugFromName(draft.name)}".`
      : "Leave empty to make it from the name.";

  return (
    <form ref={formRef} onSubmit={save} noValidate className="space-y-5">
      <Section title="Basics">
        <SelectField
          label="Where it goes"
          name="parentCategoryId"
          autoComplete="off"
          disabled={parentLocked}
          hint={
            parentLocked
              ? `It has ${childCount} ${childCount === 1 ? "subcategory" : "subcategories"}, so it stays a top-level category.`
              : "A top-level category (Fruits), or a subcategory inside one (Mangoes in Fruits)."
          }
          groups={[
            { label: "", options: [{ value: TOP_LEVEL, label: "Top-level category" }] },
            ...(parents.length ? [{ label: "Subcategory of", options: parents.map((p) => ({ value: String(p.categoryId), label: p.name })) }] : []),
          ]}
          value={draft.parentCategoryId === null ? TOP_LEVEL : String(draft.parentCategoryId)}
          onChange={(v) => set("parentCategoryId")(v === TOP_LEVEL ? null : Number(v))}
          error={errors.parentCategoryId}
        />
        <TextField
          label="Name"
          name="name"
          autoComplete="off"
          maxLength={CATEGORY_LIMITS.name}
          placeholder={kind === "category" ? "Fresh Fruits" : "Mangoes"}
          value={draft.name}
          onChange={set("name")}
          error={errors.name}
          autoFocus={isNew}
        />
        <TextField
          label="Web address (slug)"
          name="slug"
          autoComplete="off"
          optional
          prefix={prefix}
          maxLength={CATEGORY_LIMITS.slug}
          placeholder={slugFromName(draft.name) ?? (kind === "category" ? "fresh-fruits" : "mangoes")}
          value={draft.slug}
          // Lowercase as they type; the rest is checked on save.
          onChange={(v) => set("slug")(v.toLowerCase().replace(/\s+/g, "-"))}
          error={errors.slug}
          hint={slugHint}
        />
        <TextAreaField
          label="Description"
          name="description"
          optional
          maxLength={CATEGORY_LIMITS.description}
          placeholder={kind === "category" ? "Farm fresh fruits from shops near you" : "Alphonso, Banganapalli and more, in season"}
          value={draft.description}
          onChange={set("description")}
          error={errors.description}
          hint="Shown on the shop page."
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
          error={errors.image}
        />
      </Section>

      <Section title="Display">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Badge"
            name="badgeLabel"
            autoComplete="off"
            optional
            maxLength={CATEGORY_LIMITS.badgeLabel}
            placeholder="New"
            value={draft.badgeLabel}
            onChange={set("badgeLabel")}
            error={errors.badgeLabel}
            hint="A short label on the tile, like New or Bestseller."
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
        <Toggle
          label="Featured"
          hint="Highlight it, for example on the home page."
          checked={draft.isFeatured}
          onChange={set("isFeatured")}
        />
        <Toggle
          label="Show in the shop"
          hint={
            draft.isActive
              ? "Shoppers can see it."
              : `Hidden from shoppers${kind === "category" ? ", together with its subcategories" : ""}. It also drops out of the admin list for now, so you can't reopen it here yet.`
          }
          warn={!draft.isActive}
          checked={draft.isActive}
          onChange={set("isActive")}
        />
      </Section>

      <Section title="Search engines (SEO)">
        <TextField
          label="SEO title"
          name="seoTitle"
          autoComplete="off"
          optional
          maxLength={CATEGORY_LIMITS.seoTitle}
          placeholder={categoryTitle({ ...draft, seoTitle: null, seoDescription: null, description: null }, parent?.name)}
          value={draft.seoTitle}
          onChange={set("seoTitle")}
          error={errors.seoTitle}
          hint={`${draft.seoTitle.length}/${CATEGORY_LIMITS.seoTitle} characters. Leave empty to use the name.`}
        />
        <TextAreaField
          label="SEO description"
          name="seoDescription"
          optional
          maxLength={CATEGORY_LIMITS.seoDescription}
          placeholder="Order fresh fruits online from local stores in Hyderabad"
          value={draft.seoDescription}
          onChange={set("seoDescription")}
          error={errors.seoDescription}
          hint="Shown under the title in Google. Leave empty to use the description."
        />
        <GooglePreview
          title={`${categoryTitle({ ...draft, seoTitle: draft.seoTitle.trim() || null, seoDescription: null, description: null }, parent?.name)} | ${SITE.name}`}
          url={`${SITE.url.replace(/^https?:\/\//, "")}${prefix}${slug ?? ""}`}
          description={categoryDescription(
            { name: draft.name.trim() || "this category", seoTitle: null, seoDescription: draft.seoDescription.trim() || null, description: draft.description.trim() || null },
            parent?.name,
          )}
        />
      </Section>

      <div aria-live="polite" className="empty:hidden">
        {message && <FormMessage error={message} />}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <Link href="/admin/categories" className="flex min-h-12 items-center justify-center rounded-full px-6 font-semibold text-muted hover:text-ink">
          Cancel
        </Link>
        <div className="sm:ml-auto sm:w-60">
          <SubmitButton pending={pending} label={isNew ? `Add ${kind}` : "Save changes"} pendingLabel={image ? "Uploading…" : "Saving…"} />
        </div>
      </div>
    </form>
  );
}

const FIELDS = new Set<CategoryField>(["parentCategoryId", "name", "slug", "description", "badgeLabel", "seoTitle", "seoDescription", "displayOrder", "isFeatured", "isActive", "image"]);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-3xl border border-line bg-white p-5 sm:p-6">
      <h2 className="font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function ImagePicker({ currentUrl, file, onFile, error }: { currentUrl: string | null; file: File | null; onFile: (file: File | null) => void; error?: string }) {
  const id = useId();
  // A local preview of the chosen file (a data: URL, so there's nothing to release later).
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    event.target.value = ""; // choosing the same file again still fires a change
    if (!picked) return;
    onFile(picked);
    if (categoryImageError(picked)) return setPreview(null); // shown as an error instead
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" && setPreview({ file: picked, url: reader.result });
    reader.readAsDataURL(picked);
  }

  function undo() {
    onFile(null);
    setPreview(null);
  }

  const shown = (preview && preview.file === file ? preview.url : null) ?? currentUrl;
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className={`relative size-32 shrink-0 overflow-hidden rounded-2xl ring-1 ${error ? "ring-red-500" : "ring-line"}`}>
          <CategoryImage key={shown ?? "none"} src={shown} alt={file ? "New picture" : shown ? "Current picture" : ""} className="size-full" iconClassName="size-10" />
          {file && <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-white">New</span>}
        </div>
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap gap-2">
            <label
              htmlFor={id}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40"
            >
              <ImagePlus aria-hidden className="size-4" />
              {shown ? "Replace picture" : "Choose picture"}
            </label>
            {file && (
              <button type="button" onClick={undo} className="flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
                <RotateCcw aria-hidden className="size-4" />
                {currentUrl ? "Keep current" : "Remove"}
              </button>
            )}
          </div>
          <input
            id={id}
            name="image"
            type="file"
            accept={CATEGORY_IMAGE_TYPES.join(",")}
            onChange={choose}
            aria-invalid={!!error}
            aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
            className="sr-only"
          />
          <p id={`${id}-hint`} className="text-sm text-muted">
            {file ? <span className="break-all font-semibold text-ink">{file.name}</span> : "JPEG or PNG, up to 2 MB."} Shown square; large pictures are resized to 512 × 512.
            {currentUrl && !file && " A new picture replaces the current one (removing it isn't possible yet)."}
          </p>
        </div>
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function Toggle({ label, hint, checked, onChange, warn }: { label: string; hint: string; checked: boolean; onChange: (value: boolean) => void; warn?: boolean }) {
  const id = useId();
  return (
    <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl border border-line p-4 hover:border-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" aria-describedby={`${id}-hint`} />
      <span
        aria-hidden
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 ${checked ? "border-ink bg-ink text-white" : "border-line bg-white"}`}
      >
        {checked && <Check className="size-3.5" strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 font-semibold text-ink">
          {label}
          {warn && <EyeOff aria-hidden className="size-3.5 text-brand-deep" />}
        </span>
        <span id={`${id}-hint`} className={`mt-0.5 block text-sm ${warn ? "text-brand-deep" : "text-muted"}`}>
          {hint}
        </span>
      </span>
    </label>
  );
}

function GooglePreview({ title, url, description }: { title: string; url: string; description: string }) {
  return (
    <figure className="rounded-2xl bg-surface p-4 ring-1 ring-line">
      <figcaption className="text-xs font-semibold uppercase tracking-wider text-muted">Google preview</figcaption>
      <div className="mt-2 min-w-0">
        <p className="truncate text-sm text-ink/80">{url}</p>
        <p className="mt-0.5 line-clamp-2 break-words text-lg leading-snug text-[#1a0dab]">{title}</p>
        <p className="mt-1 line-clamp-2 break-words text-sm text-muted">{description}</p>
      </div>
    </figure>
  );
}
