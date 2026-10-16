"use client";

import { ChevronDown, ChevronsDownUp, ChevronsUpDown, ExternalLink, FolderTree, Info, Pencil, Plus, Search, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FormMessage } from "@/components/auth/AuthCard";
import { CategoryImage } from "@/components/catalog/CategoryImage";
import type { Category, CategoryNode } from "@/lib/catalog/types";
import { categoryPath, CUSTOM_CATEGORY_PAGES } from "@/lib/catalog/validation";

const SAVED_TEXT = { added: "Category saved.", updated: "Changes saved." } as const;
const NOTICE_MS = 6000;

// The category tree: each category is a branch that opens to show its
// subcategories, joined by lines like a file tree. The data comes straight from
// the server on every visit (only open/closed and the filter are kept here).
export function CategoryTree({ tree, saved }: { tree: CategoryNode[]; saved: keyof typeof SAVED_TEXT | null }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [closed, setClosed] = useState<Set<number>>(() => new Set());
  const [notice, setNotice] = useState<string | null>(saved && SAVED_TEXT[saved]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  // Drop ?saved= so a reload doesn't repeat the message.
  useEffect(() => {
    if (saved) router.replace("/admin/categories", { scroll: false });
  }, [saved, router]);

  const subCount = tree.reduce((n, t) => n + t.children.length, 0);
  const q = query.trim().toLowerCase();
  const matches = (c: Category) => c.name.toLowerCase().includes(q) || c.slug.includes(q);
  const shown = q
    ? tree.flatMap((node) => {
        if (matches(node.category)) return [node];
        const children = node.children.filter(matches);
        return children.length ? [{ ...node, children }] : [];
      })
    : tree;
  const allOpen = closed.size === 0;

  function toggle(id: number) {
    setClosed((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  if (tree.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-line">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <FolderTree aria-hidden className="size-8" />
        </span>
        <p className="mt-4 text-lg font-bold text-ink">Build your category tree</p>
        <p className="mt-1 max-w-sm text-sm text-muted">Start with a category like Fruits, then add subcategories under it like Mangoes and Apples.</p>
        <Link href="/admin/categories/new" className="mt-5 flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85">
          <Plus aria-hidden className="size-4" />
          Add the first category
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div aria-live="polite" className="empty:hidden">
        {notice && <FormMessage notice={notice} />}
      </div>

      <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-line">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-line p-3 sm:flex-row sm:items-center sm:p-4">
          <label className="flex min-h-11 flex-1 items-center gap-2 rounded-xl bg-surface px-3 ring-1 ring-line focus-within:ring-2 focus-within:ring-brand/50">
            <Search aria-hidden className="size-5 shrink-0 text-muted" />
            <span className="sr-only">Filter categories</span>
            <input
              type="search"
              name="filter"
              autoComplete="off"
              placeholder="Filter by name or slug"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-11 w-full min-w-0 bg-transparent text-base text-ink outline-none placeholder:text-muted/70"
            />
          </label>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <p className="text-sm text-muted">
              <span className="font-semibold text-ink">{tree.length}</span> {tree.length === 1 ? "category" : "categories"} ·{" "}
              <span className="font-semibold text-ink">{subCount}</span> {subCount === 1 ? "subcategory" : "subcategories"}
            </p>
            <button
              type="button"
              onClick={() => setClosed(allOpen ? new Set(tree.map((n) => n.category.categoryId)) : new Set())}
              disabled={!!q}
              className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-ink disabled:opacity-50"
            >
              {allOpen ? <ChevronsDownUp aria-hidden className="size-4" /> : <ChevronsUpDown aria-hidden className="size-4" />}
              {allOpen ? "Collapse all" : "Expand all"}
            </button>
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">Nothing matches &quot;{query.trim()}&quot;.</p>
        ) : (
          <ul aria-label="Category tree" className="divide-y divide-line">
            {shown.map((node) => (
              <Branch key={node.category.categoryId} node={node} open={!!q || !closed.has(node.category.categoryId)} onToggle={() => toggle(node.category.categoryId)} filtering={!!q} />
            ))}
          </ul>
        )}
      </div>

      <p className="flex gap-2 px-1 text-sm text-muted">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        Only categories shown in the shop are listed. A hidden category drops out of this tree until the backend can list hidden ones.
      </p>
    </div>
  );
}

function Branch({ node, open, onToggle, filtering }: { node: CategoryNode; open: boolean; onToggle: () => void; filtering: boolean }) {
  const { category, children } = node;
  const groupId = `branch-${category.categoryId}`;
  return (
    <li className="p-3 sm:p-4">
      {/* The category itself */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onToggle}
          disabled={filtering}
          aria-expanded={open}
          aria-controls={groupId}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-surface hover:text-ink disabled:opacity-40"
        >
          <ChevronDown aria-hidden className={`size-5 transition-transform ${open ? "" : "-rotate-90"}`} />
          <span className="sr-only">
            {open ? "Hide" : "Show"} subcategories of {category.name}
          </span>
        </button>
        <CategoryImage src={category.imageUrl} alt="" className="size-12 shrink-0 rounded-xl ring-1 ring-line sm:size-14" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="break-words font-extrabold text-ink sm:text-lg">{category.name}</h2>
            <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted ring-1 ring-line">{children.length}</span>
          </div>
          <ShopLink href={categoryPath(category)} />
          <Tags category={category} ownPage={CUSTOM_CATEGORY_PAGES.has(category.slug)} />
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Link href={`/admin/categories/new?parent=${category.categoryId}`} className={ICON_BUTTON} title={`Add a subcategory to ${category.name}`}>
            <Plus aria-hidden className="size-4" />
            <span className="hidden md:inline">Subcategory</span>
            <span className="sr-only md:hidden">Add a subcategory to {category.name}</span>
          </Link>
          <Link href={`/admin/categories/${category.categoryId}/edit`} className={ICON_BUTTON} title={`Edit ${category.name}`}>
            <Pencil aria-hidden className="size-4" />
            <span className="hidden md:inline">Edit</span>
            <span className="sr-only md:hidden">Edit {category.name}</span>
          </Link>
        </div>
      </div>

      {/* Its subcategories, hanging off a line from the category */}
      <ul id={groupId} hidden={!open} aria-label={`Subcategories of ${category.name}`} className="ml-5 mt-1 sm:ml-5">
        {children.map((child) => (
          <li key={child.categoryId} className={TWIG}>
            <div className="flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-surface">
              <CategoryImage src={child.imageUrl} alt="" className="size-10 shrink-0 rounded-lg ring-1 ring-line" />
              <div className="min-w-0 flex-1">
                <p className="break-words font-semibold text-ink">{child.name}</p>
                <ShopLink href={categoryPath(child, category)} />
                <Tags category={child} />
              </div>
              <Link href={`/admin/categories/${child.categoryId}/edit`} className={ICON_BUTTON} title={`Edit ${child.name}`}>
                <Pencil aria-hidden className="size-4" />
                <span className="hidden md:inline">Edit</span>
                <span className="sr-only md:hidden">Edit {child.name}</span>
              </Link>
            </div>
          </li>
        ))}
        {!filtering && (
          <li className={TWIG}>
            <Link
              href={`/admin/categories/new?parent=${category.categoryId}`}
              className="flex min-h-11 items-center gap-2 rounded-2xl border border-dashed border-line px-3 text-sm font-semibold text-muted transition hover:border-ink hover:text-ink"
            >
              <Plus aria-hidden className="size-4" />
              {children.length ? "Add another subcategory" : `Add the first subcategory to ${category.name}`}
            </Link>
          </li>
        )}
      </ul>
    </li>
  );
}

// One leaf of the tree: a vertical line down from the category (stopping
// halfway on the last leaf) and a short elbow into the row.
const TWIG =
  "relative pl-7 py-1 before:absolute before:left-0 before:top-0 before:h-full before:border-l-2 before:border-line last:before:h-1/2 after:absolute after:left-0 after:top-1/2 after:w-5 after:border-t-2 after:border-line after:rounded-bl-lg";

function ShopLink({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener" className="-my-1 inline-flex min-h-8 max-w-full items-center gap-1 text-sm text-muted hover:text-ink hover:underline">
      <span className="truncate">{href}</span>
      <ExternalLink aria-hidden className="size-3.5 shrink-0" />
      <span className="sr-only">(opens the shop page in a new tab)</span>
    </a>
  );
}

function Tags({ category, ownPage }: { category: Category; ownPage?: boolean }) {
  const tags = [
    category.isFeatured && (
      <span key="featured" className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
        <Star aria-hidden className="size-3" />
        Featured
      </span>
    ),
    category.badgeLabel && (
      <span key="badge" className="rounded-full bg-fresh-soft px-2 py-0.5 text-xs font-bold text-fresh">
        {category.badgeLabel}
      </span>
    ),
    ownPage && (
      <span key="own" className="rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-white">
        Own page design
      </span>
    ),
    <span key="order" className="rounded-full px-2 py-0.5 text-xs font-semibold text-muted ring-1 ring-line">
      Order {category.displayOrder}
    </span>,
  ].filter(Boolean);
  return <div className="mt-1 flex flex-wrap gap-1.5">{tags}</div>;
}

const ICON_BUTTON = "flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-full bg-white px-2.5 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-ink md:px-3.5";
