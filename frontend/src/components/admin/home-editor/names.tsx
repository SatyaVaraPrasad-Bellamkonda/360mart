"use client";

import { createContext, useContext } from "react";

// Names and pictures for the product and category ids a design holds. The
// document stores only ids; names come from the preview (what the page shows
// now), the category lists, and every pick made in this session. An id not
// seen yet shows as "Product 41" until it's picked again.

export type Known = { name: string; imageUrl: string | null; note?: string };
export type Names = {
  product: (id: number) => Known;
  category: (id: number) => Known;
  learnProducts: (items: { productId: number; name: string; imageUrl: string | null; brand?: string | null }[]) => void;
  learnCategories: (items: { categoryId: number; name: string; imageUrl: string | null }[], note?: string) => void;
};

export const NamesContext = createContext<Names | null>(null);

export function useNames(): Names {
  const names = useContext(NamesContext);
  if (!names) throw new Error("useNames outside the home designer");
  return names;
}
