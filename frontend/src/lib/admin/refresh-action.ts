"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { CATEGORIES_TAG, CATEGORY_PAGES_TAG, categoryPageTag, HOME_PAGE_TAG, PRODUCTS_TAG } from "@/lib/catalog/data";
import { LEGAL_TAG } from "@/lib/legal/data";
import { ADMIN_REFRESH, type AdminRefresh } from "./refresh-targets";

// After an admin change made straight from the browser (/api/v1/admin/...),
// the pages our server caches (shop pages, admin lists) still hold the old
// copy. This marks them stale. It never calls the backend, and only an
// admin may call it: dropping caches on demand would let anyone make every
// shopper's page load slower.

export async function refreshAfterAdminChange(what: AdminRefresh, categoryId?: number): Promise<void> {
  if (!ADMIN_REFRESH.includes(what)) return;
  const user = await getCurrentUser();
  if (user?.role !== "admin") return;

  switch (what) {
    case "categories":
      updateTag(CATEGORIES_TAG);
      revalidatePath("/admin", "layout");
      return;
    case "products":
      updateTag(PRODUCTS_TAG);
      revalidatePath("/admin", "layout");
      return;
    case "categoryPage":
      if (Number.isInteger(categoryId) && (categoryId as number) > 0) updateTag(categoryPageTag(categoryId as number));
      updateTag(CATEGORY_PAGES_TAG); // the theme shows on category cards in other pages too
      return;
    case "home":
      updateTag(HOME_PAGE_TAG);
      return;
    case "campaigns":
      revalidatePath("/admin/campaigns");
      return;
    case "legal":
      updateTag(LEGAL_TAG);
      revalidatePath("/admin/legal", "layout");
      return;
    case "orders":
      revalidatePath("/admin/orders", "layout");
      return;
    case "ledger":
      revalidatePath("/admin/ledger", "layout");
      return;
    case "support":
      revalidatePath("/admin/support");
      return;
    case "stores":
      revalidatePath("/admin/stores");
      return;
  }
}
