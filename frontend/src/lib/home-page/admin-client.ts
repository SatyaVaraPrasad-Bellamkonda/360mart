import { failure, failed, invalid, refreshPages, result, unexpected, uploadFailed } from "@/lib/admin/refresh";
import { api } from "@/lib/api-client";
import type { ActionResult } from "@/lib/auth/actions";
import { categoryImageError } from "@/lib/catalog/validation";
import type { PageImagePurpose, ProductCard } from "@/lib/category-page/types";
import type { Page } from "@/lib/inventory/types";
import type { SearchResult } from "./service";
import type { AdminHomePage, HomeHistoryItem } from "./types";
import { cleanHomeDocument, homeErrors, readHomeDocument } from "./validation";

// The admin home page designer's calls, straight from the browser to
// /api/v1/admin/home-page/... (each shows in DevTools → Network). Checked here
// with the backend's rules first; the backend checks them again, and that the
// caller is an admin. Publishing marks our cached home page stale.

const FORBIDDEN = "Only admins can design the home page.";
const BASE = "/admin/home-page";

type Write = { success: boolean; message: string; version: number };
type Written = ActionResult<{ version: number; message: string }>;

export async function loadHomeAdmin(): Promise<ActionResult<AdminHomePage>> {
  return result(await api<AdminHomePage>(BASE), FORBIDDEN);
}

/** Save the whole draft. Field problems come back keyed by the backend's paths ("timeSlots[1].start"). */
export async function saveHomeDraft(version: number, input: unknown): Promise<Written> {
  const doc = readHomeDocument(input);
  if (!doc || !Number.isInteger(version) || version < 0) return unexpected();
  const clean = cleanHomeDocument(doc);
  const problems = homeErrors(clean);
  if (Object.keys(problems).length) return invalid(problems);
  return written(await api<Write>(`${BASE}/draft`, { method: "PUT", body: { version, page: clean } }));
}

/** Publish the saved draft; the shop shows it at once (our cached home page is marked stale). */
export async function publishHome(version: number): Promise<Written> {
  const res = written(await api<Write>(`${BASE}/publish`, { method: "POST", body: { version } }));
  if (res.ok) await refreshPages("home");
  return res;
}

export async function discardHomeDraft(version: number): Promise<Written> {
  return written(await api<Write>(`${BASE}/draft/discard`, { method: "POST", body: { version } }));
}

export async function homeHistory(page: number): Promise<ActionResult<Page<HomeHistoryItem>>> {
  if (!Number.isInteger(page) || page < 0) return unexpected();
  return result(await api<Page<HomeHistoryItem>>(`${BASE}/history?page=${page}&size=20`), FORBIDDEN);
}

/** Copy a published version into the draft (publish to make it live). */
export async function restoreHome(version: number, fromVersion: number): Promise<Written> {
  if (!Number.isInteger(fromVersion) || fromVersion < 1) return unexpected();
  return written(await api<Write>(`${BASE}/restore`, { method: "POST", body: { version, fromVersion } }));
}

const PURPOSES: PageImagePurpose[] = ["HERO", "HERO_MOBILE", "BANNER", "GUIDE", "OG", "HTML"];

/** Upload a home page picture (JPEG/PNG, ≤ 2 MB): multipart "purpose" + "image". Answers with its id, and its permanent public link for HTML pictures. */
export async function uploadHomeImage(form: FormData): Promise<ActionResult<{ imageId: string; url: string | null }>> {
  const purpose = form.get("purpose");
  const image = form.get("image");
  if (!PURPOSES.includes(purpose as PageImagePurpose) || !(image instanceof File) || image.size === 0) return unexpected();
  const problem = categoryImageError(image);
  if (problem) return failure("INVALID_IMAGE", problem);
  const body = new FormData();
  body.append("purpose", purpose as string);
  body.append("image", image, image.name || "home-image");
  const res = await api<{ success: boolean; message: string; id: string; url?: string | null }>(`${BASE}/images`, { method: "POST", body });
  if (!res.ok) return uploadFailed(res.error, FORBIDDEN);
  if (!res.data?.id) return unexpected();
  return { ok: true, data: { imageId: res.data.id, url: res.data.url ?? null } };
}

/** The designer's product picker: products on sale matching the text (a type-ahead call, so not counted as a search). */
export async function pickProducts(q: string, signal?: AbortSignal): Promise<ActionResult<ProductCard[]>> {
  const text = typeof q === "string" ? q.trim().slice(0, 100) : "";
  if (text.length < 2) return { ok: true, data: [] };
  const query = new URLSearchParams({ q: text, page: "0", size: "12", suggest: "true" });
  const res = await api<SearchResult>(`/search?${query}`, { signal });
  return res.ok ? { ok: true, data: res.data.products.items } : failed(res.error);
}

function written(res: Awaited<ReturnType<typeof api<Write>>>): Written {
  return res.ok ? { ok: true, data: { version: res.data.version, message: res.data.message } } : failed(res.error, FORBIDDEN);
}
