import { failure, failed, invalid, refreshPages, result, unexpected, uploadFailed } from "@/lib/admin/refresh";
import { api } from "@/lib/api-client";
import type { ActionResult } from "@/lib/auth/actions";
import { categoryImageError } from "@/lib/catalog/validation";
import type { PageImagePurpose, ProductCard } from "@/lib/category-page/types";
import type { Page } from "@/lib/inventory/types";
import type { SearchResult } from "./service";
import { VIDEO_MAX_BYTES, VIDEO_TYPES } from "./hero";
import type { AdminHomePage, HomeHistoryItem, HomePageDocument, PageVideoPurpose } from "./types";
import { cleanHomeDocument, homeErrors } from "./validation";

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
export async function saveHomeDraft(version: number, doc: HomePageDocument): Promise<Written> {
  if (!Number.isInteger(version) || version < 0) return unexpected();
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

type UploadUrl = { videoId: string; uploadUrl: string; method: string; headers: Record<string, string> | null; expiresAt: string; maxSizeBytes: number };

/**
 * Upload a banner video (MP4/WebM; 20 MB, or 8 MB for the phone version) in
 * three steps, so the file never passes through our servers (Vercel and Spring
 * both cap request sizes far below a video):
 * 1. POST …/videos/upload-url → a 10-minute signed link and a new id;
 * 2. PUT the file itself straight to storage (progress 0–1 reported);
 * 3. POST …/videos/{id}/complete → the backend checks the stored file (real size, type, first bytes).
 * Answers with the id for slides[i].videoId / mobileVideoId and its permanent link.
 */
export async function uploadHomeVideo(file: File, purpose: PageVideoPurpose, onProgress: (share: number) => void): Promise<ActionResult<{ videoId: string; url: string }>> {
  if (!(VIDEO_TYPES as readonly string[]).includes(file.type)) return failure("VALIDATION_FAILED", "Choose an MP4 or WebM video.");
  const max = VIDEO_MAX_BYTES[purpose];
  if (file.size === 0) return failure("VALIDATION_FAILED", "That file is empty. Choose another video.");
  if (file.size > max) return failure("FILE_TOO_LARGE", `The video must be at most ${max / 1024 / 1024} MB. Shorten it, or export it at 720p.`);

  const link = await api<UploadUrl>(`${BASE}/videos/upload-url`, { method: "POST", body: { purpose, fileName: file.name.slice(0, 200) || "banner-video", contentType: file.type, sizeBytes: file.size } });
  if (!link.ok) {
    if (link.error.status === 413 || link.error.code === "FILE_TOO_LARGE") return failure("FILE_TOO_LARGE", `The video must be at most ${max / 1024 / 1024} MB.`);
    return uploadFailed(link.error, FORBIDDEN);
  }

  const sent = await putFile(link.data, file, onProgress);
  if (!sent) return failure("STORAGE_UNAVAILABLE", "The video couldn't be uploaded. Check your connection and try again.");

  const done = await api<{ success: boolean; message: string; id: string; url: string }>(`${BASE}/videos/${encodeURIComponent(link.data.videoId)}/complete`, { method: "POST" });
  if (!done.ok) {
    if (done.error.code === "UPLOAD_EXPIRED" || done.error.status === 410) return failure("UPLOAD_EXPIRED", "The upload took too long. Please upload the video again.");
    return failed(done.error, FORBIDDEN);
  }
  return { ok: true, data: { videoId: done.data.id || link.data.videoId, url: done.data.url } };
}

/** The file straight to storage with the headers the backend asked for. XHR, not fetch: fetch can't report upload progress. */
function putFile(link: UploadUrl, file: File, onProgress: (share: number) => void): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open(link.method || "PUT", link.uploadUrl);
    for (const [name, value] of Object.entries(link.headers ?? {})) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false);
    xhr.ontimeout = () => resolve(false);
    xhr.send(file);
  });
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
