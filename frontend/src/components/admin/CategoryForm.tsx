"use client";

import Link from "next/link";
import { useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { FormMessage } from "@/components/auth/AuthCard";
import { SelectField, SubmitButton, TextAreaField, TextField } from "@/components/auth/AuthFields";
import { RichTextField } from "@/components/RichTextField";
import { saveCategoryAction } from "@/lib/catalog/actions";
import { categoryDescription, categoryTitle } from "@/lib/catalog/seo";
import type { CategoryDraft, CategoryErrors, CategoryField } from "@/lib/catalog/types";
import { CATEGORY_LIMITS, CUSTOM_CATEGORY_PAGES, categoryErrors, categoryImageError, effectiveSlug, slugFromName } from "@/lib/catalog/validation";
import { SITE } from "@/lib/site";
import { GooglePreview, ImagePicker, Section, Toggle } from "./FormParts";

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
        <RichTextField
          label="Description"
          name="description"
          optional
          rows={4}
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
