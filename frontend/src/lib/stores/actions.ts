"use server";

import { revalidatePath } from "next/cache";
import type { ActionError, ActionResult } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/dal";
import type { Role } from "@/lib/auth/roles";
import { clearSession, getSessionToken } from "@/lib/auth/session";
import { isUuid } from "@/lib/auth/validation";
import type { ApiFailure, ApiResult } from "@/lib/backend/client";
import * as api from "./store-service";
import type { ReviewDecision, StoreApplication } from "./types";
import {
  documentErrors,
  hoursErrors,
  logoError,
  readDocumentDraft,
  readHoursDraft,
  readStoreDraft,
  reasonError,
  storeErrors,
  toDocumentInput,
  toHoursInput,
  toStoreInput,
} from "./validation";

// Store registration (shopkeeper) and review (admin) actions. Same pattern as
// the other actions: check everything again here (browser input can be forged),
// then the backend checks it once more, including the caller's role. Each one
// returns the whole application, so the screen refreshes from the answer.

type Result = Promise<ActionResult<StoreApplication>>;

// Backend codes that belong to one field of the details form.
const STORE_FIELD_OF: Record<string, string> = {
  STORE_SLUG_TAKEN: "slug",
  SLUG_TAKEN: "slug",
  SLUG_RESERVED: "slug",
  INVALID_IMAGE: "logo",
  IMAGE_TOO_LARGE: "logo",
};

/** Start the application (first save) or save the draft. Form parts: "draft" (JSON) + optional "logo". */
export async function saveStoreAction(isNew: boolean, form: FormData): Result {
  if (!(form instanceof FormData)) return fail(unexpected());
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(String(form.get("draft") ?? ""));
  } catch {
    return fail(unexpected());
  }
  const draft = readStoreDraft(parsed);
  if (!draft) return fail(unexpected());

  const fieldErrors: Record<string, string> = { ...storeErrors(draft) } as Record<string, string>;
  const logo = form.get("logo");
  const file = logo instanceof File && logo.size > 0 ? logo : null;
  const logoProblem = file && logoError(file);
  if (logoProblem) fieldErrors.logo = logoProblem;
  if (Object.keys(fieldErrors).length) return fail({ code: "VALIDATION_FAILED", message: "Please fix the highlighted fields.", fieldErrors });

  return run("seller", (token) => (isNew ? api.createStore(token, toStoreInput(draft), file) : api.updateStore(token, toStoreInput(draft), file)), storeError);
}

/** All 7 days at once. */
export async function saveHoursAction(input: unknown): Result {
  const days = readHoursDraft(input);
  if (!days) return fail(unexpected());
  const problems = hoursErrors(days);
  if (Object.keys(problems).length) return fail({ code: "VALIDATION_FAILED", message: "Please fix the highlighted days.", fieldErrors: problems as Record<string, string> });
  return run("seller", (token) => api.saveHours(token, toHoursInput(days)));
}

/** Form parts: "document" (JSON: type, number, valid until) + "file". */
export async function uploadDocumentAction(form: FormData): Result {
  if (!(form instanceof FormData)) return fail(unexpected());
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(String(form.get("document") ?? ""));
  } catch {
    return fail(unexpected());
  }
  const draft = readDocumentDraft(parsed);
  if (!draft) return fail(unexpected());
  const upload = form.get("file");
  const file = upload instanceof File && upload.size > 0 ? upload : null;
  const problems = documentErrors(draft, file);
  if (Object.keys(problems).length || !file) return fail({ code: "VALIDATION_FAILED", message: "Please fix the highlighted fields.", fieldErrors: problems as Record<string, string> });
  return run("seller", (token) => api.uploadDocument(token, toDocumentInput(draft), file), documentError);
}

export async function deleteDocumentAction(documentId: unknown): Result {
  if (!isUuid(documentId)) return fail(error("DOCUMENT_NOT_FOUND", "Document not found."));
  return run("seller", (token) => api.deleteDocument(token, documentId as string));
}

export async function submitStoreAction(): Result {
  return run("seller", (token) => api.submitStore(token));
}

export async function withdrawStoreAction(): Result {
  return run("seller", (token) => api.withdrawStore(token));
}

// ---- admin ----

export async function reviewDocumentAction(storeId: unknown, documentId: unknown, decision: unknown): Result {
  if (!isUuid(storeId) || !isUuid(documentId)) return fail(error("DOCUMENT_NOT_FOUND", "Document not found."));
  const checked = readDecision(decision);
  if (!checked.ok) return checked;
  return run("admin", (token) => api.reviewDocument(token, storeId as string, documentId as string, checked.data));
}

export async function reviewStoreAction(storeId: unknown, decision: unknown): Result {
  if (!isUuid(storeId)) return fail(error("STORE_NOT_FOUND", "Store not found."));
  const checked = readDecision(decision);
  if (!checked.ok) return checked;
  return run("admin", (token) => api.reviewStore(token, storeId as string, checked.data));
}

function readDecision(input: unknown): ActionResult<ReviewDecision> {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  if (raw.approved === true) return { ok: true, data: { approved: true } };
  if (raw.approved !== false) return fail(unexpected());
  const reason = typeof raw.reason === "string" ? raw.reason.trim().replace(/ {2,}/g, " ") : "";
  const problem = reasonError(reason);
  if (problem) return fail({ code: "VALIDATION_FAILED", message: problem, fieldErrors: { reason: problem } });
  return { ok: true, data: { approved: false, reason } };
}

// ---- shared ----

/** Checks the role, calls the backend, refreshes the cached pages and shapes the answer. */
async function run(role: Role, call: (token: string) => Promise<ApiResult<StoreApplication>>, toError: (failure: ApiFailure) => ActionError = generalError): Result {
  const token = await getSessionToken();
  const user = token ? await getCurrentUser() : null;
  if (!token || !user) return fail(error("UNAUTHENTICATED", "Please login to continue."));
  if (user.role !== role) return fail(forbidden(role));

  const res = await call(token);
  if (!res.ok) {
    if (res.error.code === "UNAUTHENTICATED") await clearSession();
    if (res.error.code === "FORBIDDEN") return fail(forbidden(role));
    return fail(toError(res.error));
  }
  // Back/forward and the dashboard show the new state, not a kept copy.
  revalidatePath(role === "admin" ? "/admin" : "/seller", "layout");
  return { ok: true, data: res.data };
}

function storeError(failure: ApiFailure): ActionError {
  const field = STORE_FIELD_OF[failure.code];
  if (field) return { code: failure.code, message: failure.message, fieldErrors: { [field]: failure.message } };
  if (failure.code === "FILE_TOO_LARGE" || failure.status === 413) return { code: "IMAGE_TOO_LARGE", message: "The logo must be at most 2 MB.", fieldErrors: { logo: "The logo must be at most 2 MB." } };
  return generalError(failure);
}

function documentError(failure: ApiFailure): ActionError {
  if (failure.code === "INVALID_DOCUMENT_FILE" || failure.code === "DOCUMENT_TOO_LARGE") return { code: failure.code, message: failure.message, fieldErrors: { file: failure.message } };
  if (failure.code === "FILE_TOO_LARGE" || failure.status === 413) return { code: "DOCUMENT_TOO_LARGE", message: "The document must be at most 5 MB.", fieldErrors: { file: "The document must be at most 5 MB." } };
  return generalError(failure);
}

function generalError(failure: ApiFailure): ActionError {
  if (failure.status === 502 || failure.code === "STORAGE_UNAVAILABLE") return error(failure.code, "File storage is busy right now. Please try again in a minute.");
  return { code: failure.code, message: failure.message, fieldErrors: failure.fieldErrors };
}

function forbidden(role: Role) {
  return error("FORBIDDEN", role === "admin" ? "Only admins can review stores." : "Only shopkeeper accounts can register a store. Log in with your shopkeeper account.");
}

function error(code: string, message: string): ActionError {
  return { code, message, fieldErrors: {} };
}

function unexpected() {
  return error("UNKNOWN", "Something went wrong. Please try again.");
}

function fail(failure: ActionError): { ok: false; error: ActionError } {
  return { ok: false, error: { code: failure.code, message: failure.message, fieldErrors: failure.fieldErrors } };
}
