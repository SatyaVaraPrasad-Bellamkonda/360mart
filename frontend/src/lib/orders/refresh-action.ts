"use server";

import { revalidatePath } from "next/cache";

// After the browser changed the cart or orders through /api/v1 directly, the
// server-rendered pages that show them are re-rendered on their next visit,
// as the old server actions did. No backend call here.
export async function refreshPagesAction(what: "cart" | "orders"): Promise<void> {
  revalidatePath("/cart");
  if (what === "orders") revalidatePath("/account", "layout");
}
