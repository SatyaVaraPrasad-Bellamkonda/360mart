import { failed, failure, invalid, refreshPages, result, unexpected, uploadFailed } from "@/lib/admin/refresh";
import { api, type ApiResult } from "@/lib/api-client";
import type { ActionResult } from "@/lib/auth/actions";
import { categoryImageError, parseCategoryId } from "@/lib/catalog/validation";
import type { Page } from "@/lib/inventory/types";
import type { AdminCategoryPage, PageDocument, PageHistoryItem, PageImagePurpose, PageWriteResult } from "./types";
import { cleanDocument, pageErrors } from "./validation";

// The admin page editor's calls, made straight from the browser to
// /api/v1/admin/categories/{id}/page/... (each shows in DevTools → Network).
// Checked here with the backend's rules, then again by the backend, which
// also checks the caller is an admin. Publishing marks our cached shop pages
// stale so the change shows at once; drafts aren't shown to shoppers.

type Written = ActionResult<{ version: number; message: string }>;

const FORBIDDEN = "Only admins can design category pages.";
const PURPOSES: PageImagePurpose[] = ["HERO", "HERO_MOBILE", "BANNER", "GUIDE", "OG"];
const base = (categoryId: number) => `/admin/categories/${categoryId}/page`;
const notFound = () => failure("CATEGORY_NOT_FOUND", "Category not found.");

/** Re-read the editor's data (after a conflict, a discard or a restore). */
export async function loadAdminPage(categoryId: number): Promise<ActionResult<AdminCategoryPage>> {
  if (parseCategoryId(categoryId) === null) return notFound();
  return result(await api<AdminCategoryPage>(base(categoryId)), FORBIDDEN);
}

/** Save the whole draft. Field problems come back keyed by the backend's paths ("hero.headline", "sections[2]"). */
export async function saveDraft(categoryId: number, version: number, isSubcategory: boolean, doc: PageDocument): Promise<Written> {
  if (parseCategoryId(categoryId) === null) return notFound();
  if (!doc || !Number.isInteger(version) || version < 0) return unexpected();
  const clean = cleanDocument(doc, isSubcategory);
  const problems = pageErrors(clean, isSubcategory);
  if (Object.keys(problems).length) return invalid(problems);
  return written(await api<PageWriteResult>(`${base(categoryId)}/draft`, { method: "PUT", body: { version, page: clean } }));
}

/** Publish the saved draft; the shop shows it at once (the cached page is dropped). */
export async function publish(categoryId: number, version: number): Promise<Written> {
  if (parseCategoryId(categoryId) === null) return notFound();
  const res = written(await api<PageWriteResult>(`${base(categoryId)}/publish`, { method: "POST", body: { version } }));
  if (res.ok) await refreshPages("categoryPage", categoryId);
  return res;
}

export async function discardDraft(categoryId: number, version: number): Promise<Written> {
  if (parseCategoryId(categoryId) === null) return notFound();
  return written(await api<PageWriteResult>(`${base(categoryId)}/draft/discard`, { method: "POST", body: { version } }));
}

export async function loadHistory(categoryId: number, page: number): Promise<ActionResult<Page<PageHistoryItem>>> {
  if (parseCategoryId(categoryId) === null) return notFound();
  if (!Number.isInteger(page) || page < 0) return unexpected();
  return result(await api<Page<PageHistoryItem>>(`${base(categoryId)}/history?page=${page}&size=20`), FORBIDDEN);
}

/** Copy a published version into the draft (publish to make it live). */
export async function restore(categoryId: number, version: number, fromVersion: number): Promise<Written> {
  if (parseCategoryId(categoryId) === null) return notFound();
  if (!Number.isInteger(fromVersion) || fromVersion < 1) return unexpected();
  return written(await api<PageWriteResult>(`${base(categoryId)}/restore`, { method: "POST", body: { version, fromVersion } }));
}

/** Upload a page picture (JPEG/PNG, ≤ 2 MB); answers with its id for hero.imageId etc. */
export async function uploadPageImage(categoryId: number, purpose: PageImagePurpose, image: File | null): Promise<ActionResult<{ imageId: string }>> {
  if (parseCategoryId(categoryId) === null) return notFound();
  if (!PURPOSES.includes(purpose) || !image || image.size === 0) return unexpected();
  const problem = categoryImageError(image);
  if (problem) return failure("INVALID_IMAGE", problem);
  const form = new FormData();
  form.append("purpose", purpose);
  form.append("image", image, image.name || "page-image");
  const res = await api<{ success: boolean; message: string; id: string }>(`${base(categoryId)}/images`, { method: "POST", body: form });
  if (!res.ok) return uploadFailed(res.error, FORBIDDEN);
  return { ok: true, data: { imageId: res.data.id } };
}

function written(res: ApiResult<PageWriteResult>): Written {
  return res.ok ? { ok: true, data: { version: res.data.version, message: res.data.message } } : failed(res.error, FORBIDDEN);
}
