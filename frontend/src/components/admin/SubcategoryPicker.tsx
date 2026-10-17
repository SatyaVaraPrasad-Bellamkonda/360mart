"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { loadSubcategoriesAction } from "@/lib/catalog/actions";
import { toPlace, type PickerPlace, type PickerStart } from "./picker-place";
import { SearchSelect, type SearchSelectHandle } from "./SearchSelect";

export type { PickerPlace, PickerStart } from "./picker-place";

type Props = {
  start: PickerStart;
  /** The chosen subcategory id, or 0 for none yet. */
  value: number;
  /** A subcategory with its category; null when the category changed and no subcategory is chosen yet. */
  onChange: (choice: { category: PickerPlace; subcategory: PickerPlace } | null) => void;
  /** The category chosen so far (e.g. to show a prompt). */
  onCategoryChange?: (category: PickerPlace) => void;
  hint?: string;
  error?: string;
};

// Where a product sits, in two steps: a searchable Category dropdown, then a
// searchable Subcategory dropdown with only that category's subcategories.
// Those are fetched when a category is picked (one call; categories already
// opened are kept), never all up front. A category with one subcategory picks it.
export function SubcategoryPicker({ start, value, onChange, onCategoryChange, hint, error }: Props) {
  const { sessionExpired } = useAuth();
  const subRef = useRef<SearchSelectHandle>(null);
  const known = useRef(new Map<number, PickerPlace[]>(start.categoryId ? [[start.categoryId, start.subcategories]] : []));
  const [categoryId, setCategoryId] = useState(start.categoryId);
  const [subcategories, setSubcategories] = useState(start.subcategories);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const category = start.categories.find((c) => c.categoryId === categoryId);
  // Open the subcategory list once it has rendered with the new options (and isn't loading).
  const [openTick, setOpenTick] = useState(0);
  const opened = useRef(0);
  useEffect(() => {
    if (openTick <= opened.current || loading) return;
    opened.current = openTick;
    subRef.current?.open();
  }, [openTick, loading]);

  function show(chosen: PickerPlace, list: PickerPlace[]) {
    setSubcategories(list);
    if (list.length === 1) return onChange({ category: chosen, subcategory: list[0] });
    onChange(null);
    if (list.length) setOpenTick((t) => t + 1); // next step right away
  }

  function chooseCategory(id: number) {
    const chosen = start.categories.find((c) => c.categoryId === id);
    if (!chosen) return;
    setCategoryId(id);
    setLoadError(null);
    onCategoryChange?.(chosen);
    const cached = known.current.get(id);
    if (cached) return show(chosen, cached);
    setSubcategories([]);
    onChange(null);
    startLoading(async () => {
      const res = await loadSubcategoriesAction(id);
      if (!res.ok) {
        if (res.error.code === "UNAUTHENTICATED") return sessionExpired();
        return setLoadError(res.error.message);
      }
      const list = res.data.map(toPlace);
      known.current.set(id, list);
      show(chosen, list);
    });
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <SearchSelect
          label="Category"
          placeholder="Choose a category"
          searchPlaceholder="Search categories"
          emptyText="No categories yet."
          options={start.categories.map((c) => ({ value: c.categoryId, label: c.name, detail: `/${c.slug}`, imageUrl: c.imageUrl }))}
          value={categoryId}
          onChange={chooseCategory}
          error={error && !categoryId ? error : undefined}
        />
        <SearchSelect
          handle={subRef}
          label="Subcategory"
          placeholder={category ? (subcategories.length || loading ? `Choose in ${category.name}` : "No subcategories yet") : "Choose a category first"}
          searchPlaceholder={category ? `Search ${category.name}` : "Search"}
          emptyText="This category has no subcategories yet."
          disabled={!category || (!loading && subcategories.length === 0)}
          loading={loading}
          options={subcategories.map((c) => ({ value: c.categoryId, label: c.name, detail: `/${category?.slug}/${c.slug}`, imageUrl: c.imageUrl }))}
          value={value}
          onChange={(id) => {
            const subcategory = subcategories.find((c) => c.categoryId === id);
            if (category && subcategory) onChange({ category, subcategory });
          }}
          error={loadError ?? (error && categoryId ? error : undefined)}
        />
      </div>
      {category && !loading && !loadError && subcategories.length === 0 && (
        <p className="mt-1.5 text-sm text-muted">
          {category.name} has no subcategories yet.{" "}
          <Link href={`/admin/categories/new?parent=${category.categoryId}`} className="font-semibold text-ink underline-offset-2 hover:underline">
            Add one
          </Link>
        </p>
      )}
      {hint && <p className="mt-1.5 text-sm text-muted">{hint}</p>}
    </div>
  );
}
