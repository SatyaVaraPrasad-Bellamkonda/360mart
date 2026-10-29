import "server-only";
import { getCurrentUser } from "@/lib/auth/dal";
import { getSessionToken } from "@/lib/auth/session";
import { callApiFile } from "@/lib/backend/client";
import { readSubcategoryIds, sheetCode, SHEETS, type SheetFormat, type SheetKind } from "./sheets";

// Body of the sheet download routes (…/price-sheet/download, …/batch-sheet/download):
// ?subcategoryIds=12&subcategoryIds=15&format=XLSX. The browser never calls the
// API itself (the session cookie lives on our server), so the file comes
// through here: checked, fetched with the shopkeeper's session, and streamed
// back with its name. Errors are JSON ({ code, message, fieldErrors }).
export async function downloadSheet(request: Request, kind: SheetKind): Promise<Response> {
  const { api, name: sheetName, fileStem } = SHEETS[kind];
  const url = new URL(request.url);
  const ids = readSubcategoryIds(url.searchParams.getAll("subcategoryIds"));
  const formatParam = (url.searchParams.get("format") ?? "XLSX").toUpperCase();
  if (!ids || (formatParam !== "XLSX" && formatParam !== "CSV")) return problem(400, "VALIDATION_FAILED", "Choose 1 to 30 subcategories and a format.");
  const format = formatParam as SheetFormat;

  const token = await getSessionToken();
  const user = token ? await getCurrentUser() : null;
  if (!token || !user) return problem(401, "UNAUTHENTICATED", "Please login to continue.");
  if (user.role !== "seller") return problem(403, "FORBIDDEN", `Only shopkeeper accounts can download the ${sheetName}.`);

  const query = new URLSearchParams({ format });
  ids.forEach((id) => query.append("subcategoryIds", String(id)));
  const res = await callApiFile(`${api}?${query}`, { sessionToken: token });
  if (!res.ok) return problem(res.error.status || 502, sheetCode(res.error.code), res.error.message, res.error.fieldErrors);

  const upstream = res.response;
  const fallback = `${fileStem}.${format.toLowerCase()}`;
  const name = /filename="?([^";]+)"?/.exec(upstream.headers.get("content-disposition") ?? "")?.[1] ?? fallback;
  // Only safe characters in the header we send on.
  const safe = name.replace(/[^\w.-]/g, "_").slice(0, 120) || fallback;
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? (format === "CSV" ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
      "Content-Disposition": `attachment; filename="${safe}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

function problem(status: number, code: string, message: string, fieldErrors: Record<string, string> = {}) {
  return Response.json({ code, message, fieldErrors }, { status, headers: { "Cache-Control": "no-store" } });
}
