"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SelectField } from "@/components/auth/AuthFields";
import { toastError } from "@/components/Toaster";
import { loadCatalogSubcategoriesAction } from "@/lib/inventory/actions";

type Place = { categoryId: number; name: string };

// Category, then subcategory (the catalogue filters by subcategory). The
// subcategories of a category load only when it's picked (from the shop's cache),
// never for all categories up front. Choosing one updates the URL (?category=&sub=).
export function CatalogFilter({ categories, categoryId, subcategories, subId, q }: { categories: Place[]; categoryId: number; subcategories: Place[]; subId: number; q: string }) {
  const router = useRouter();
  const [category, setCategory] = useState(categoryId);
  const [subs, setSubs] = useState(subcategories);
  const [loading, startLoading] = useTransition();

  const go = (cat: number, sub: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (cat) p.set("category", String(cat));
    if (sub) p.set("sub", String(sub));
    const s = p.toString();
    router.push(`/seller/products/add${s ? `?${s}` : ""}`);
  };

  function chooseCategory(value: string) {
    const id = Number(value) || 0;
    setCategory(id);
    setSubs([]);
    if (!id) return go(0, 0);
    startLoading(async () => {
      const res = await loadCatalogSubcategoriesAction(id);
      if (!res.ok) return toastError(res.error.message);
      setSubs(res.data);
      // One subcategory: no choice to make.
      if (res.data.length === 1) go(id, res.data[0].categoryId);
    });
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <SelectField
        label="Category"
        name="category"
        autoComplete="off"
        groups={[{ label: "", options: [{ value: "", label: "All categories" }, ...categories.map((c) => ({ value: String(c.categoryId), label: c.name }))] }]}
        value={category ? String(category) : ""}
        onChange={chooseCategory}
      />
      <SelectField
        label="Subcategory"
        name="sub"
        autoComplete="off"
        disabled={!category || loading || subs.length === 0}
        placeholder={loading ? "Loading…" : !category ? "Pick a category first" : subs.length === 0 ? "None yet" : "Choose"}
        groups={[{ label: "", options: subs.map((c) => ({ value: String(c.categoryId), label: c.name })) }]}
        value={category === categoryId && subId ? String(subId) : ""}
        onChange={(v) => go(category, Number(v))}
      />
    </div>
  );
}
