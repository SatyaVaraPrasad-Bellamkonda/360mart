import { getCurrentUser } from "@/lib/auth/dal";
import { getSessionToken } from "@/lib/auth/session";
import { callApiFile } from "@/lib/backend/client";
import { PRODUCT_SHEET_API, readCategoryIds } from "@/lib/catalog/product-sheet";

// GET /admin/products/sheet/download?categoryIds=3&categoryIds=12 (none = the
// whole catalog). The browser never calls the API itself (the session cookie
// lives on our server), so the file comes through here: checked, fetched with
// the admin's session and streamed back with its name. Errors are JSON
// ({ code, message }), read by the bulk edit page.
export async function GET(request: Request): Promise<Response> {
  const ids = readCategoryIds(new URL(request.url).searchParams.getAll("categoryIds"));
  if (!ids) return problem(400, "VALIDATION_FAILED", "Choose up to 50 categories from the list.");

  const token = await getSessionToken();
  const user = token ? await getCurrentUser() : null;
  if (!token || !user) return problem(401, "UNAUTHENTICATED", "Please login to continue.");
  if (user.role !== "admin") return problem(403, "FORBIDDEN", "Only admins can download the product sheet.");

  const query = new URLSearchParams();
  ids.forEach((id) => query.append("categoryIds", String(id)));
  const res = await callApiFile(ids.length ? `${PRODUCT_SHEET_API}?${query}` : PRODUCT_SHEET_API, { sessionToken: token });
  if (!res.ok) return problem(res.error.status || 502, res.error.code, res.error.message);

  const upstream = res.response;
  const name = /filename="?([^";]+)"?/.exec(upstream.headers.get("content-disposition") ?? "")?.[1] ?? "products.xlsx";
  // Only safe characters in the header we send on.
  const safe = name.replace(/[^\w.-]/g, "_").slice(0, 120) || "products.xlsx";
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safe}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

function problem(status: number, code: string, message: string) {
  return Response.json({ code, message }, { status, headers: { "Cache-Control": "no-store" } });
}
