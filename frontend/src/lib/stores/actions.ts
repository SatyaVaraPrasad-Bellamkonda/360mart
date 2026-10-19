"use server";

import { revalidatePath } from "next/cache";
import type { ActionError, ActionResult } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/dal";
import type { Role } from "@/lib/auth/roles";
import { clearSession, getSessionToken } from "@/lib/auth/session";
import { isUuid } from "@/lib/auth/validation";
import type { ApiFailure, ApiResult } from "@/lib/backend/client";
import * as api from "./store-service";
import type { ActionResponse } from "./store-service";
import type { ReviewDecision, StoreApplication } from "./types";
import {
  documentErrors,
  hoursErrors,
  logoError,
  readDocumentDraft,
  readExceptionDraft,
  exceptionErrors,
  toExceptionInput,
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
// then the backend checks it once more, including the caller's role. A write
// only returns a short confirmation, so each action then reads the application
// once (GET) and returns it: always two backend calls, and the screen refreshes
// from the answer.

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

  return run("seller", (token) => (isNew ? api.createStore(token, toStoreInput(draft), file) : api.updateStore(token, toStoreInput(draft), file)), MY_STORE, storeError);
}

/** All 7 days at once. `from` = the page saving (the dashboard's dialog or the store page). */
export async function saveHoursAction(input: unknown, from?: unknown): Result {
  const days = readHoursDraft(input);
  if (!days) return fail(unexpected());
  const problems = hoursErrors(days);
  if (Object.keys(problems).length) return fail({ code: "VALIDATION_FAILED", message: "Please fix the highlighted days.", fieldErrors: problems as Record<string, string> });
  return run("seller", (token) => api.saveHours(token, toHoursInput(days)), MY_STORE, generalError, otherPage(from));
}

/** Add or update one date's holiday / special hours. `from` = the page saving it. */
export async function saveHoursExceptionAction(input: unknown, from?: unknown): Result {
  const draft = readExceptionDraft(input);
  if (!draft) return fail(unexpected());
  const problems = exceptionErrors(draft);
  if (Object.keys(problems).length) return fail({ code: "VALIDATION_FAILED", message: Object.values(problems)[0] ?? "Please fix the highlighted fields.", fieldErrors: problems as Record<string, string> });
  return run("seller", (token) => api.saveHoursException(token, toExceptionInput(draft)), MY_STORE, exceptionError, otherPage(from));
}

/** Remove a date added by mistake: the backend needs both its id and its date. */
export async function deleteHoursExceptionAction(exceptionId: unknown, date: unknown, from?: unknown): Result {
  if (typeof exceptionId !== "number" || !Number.isSafeInteger(exceptionId) || exceptionId <= 0 || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return fail(error("HOURS_EXCEPTION_NOT_FOUND", "This date isn't in your list any more. Reload the page."));
  }
  return run("seller", (token) => api.saveHoursException(token, { exceptionId, date, delete: true }), MY_STORE, exceptionError, otherPage(from));
}

/** The seller page NOT showing the result, to mark as changed (see run). */
function otherPage(from: unknown): string {
  return from === "/seller" ? "/seller/store" : "/seller";
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
  return run("seller", (token) => api.uploadDocument(token, toDocumentInput(draft), file), MY_STORE, documentError);
}

export async function deleteDocumentAction(documentId: unknown): Result {
  if (!isUuid(documentId)) return fail(error("DOCUMENT_NOT_FOUND", "Document not found."));
  return run("seller", (token) => api.deleteDocument(token, documentId as string), MY_STORE);
}

export async function submitStoreAction(): Result {
  return run("seller", (token) => api.submitStore(token), MY_STORE);
}

export async function withdrawStoreAction(): Result {
  return run("seller", (token) => api.withdrawStore(token), MY_STORE);
}

// ---- admin ----

export async function reviewDocumentAction(storeId: unknown, documentId: unknown, decision: unknown): Result {
  if (!isUuid(storeId) || !isUuid(documentId)) return fail(error("DOCUMENT_NOT_FOUND", "Document not found."));
  const checked = readDecision(decision);
  if (!checked.ok) return checked;
  return run("admin", (token) => api.reviewDocument(token, storeId as string, documentId as string, checked.data), (token) => api.getStore(token, storeId as string));
}

export async function reviewStoreAction(storeId: unknown, decision: unknown): Result {
  if (!isUuid(storeId)) return fail(error("STORE_NOT_FOUND", "Store not found."));
  const checked = readDecision(decision);
  if (!checked.ok) return checked;
  return run("admin", (token) => api.reviewStore(token, storeId as string, checked.data), (token) => api.getStore(token, storeId as string));
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

const MY_STORE = (token: string) => api.getMyStore(token);

/** Checks the role, makes the write, reads the application back, refreshes the cached pages. */
async function run(
  role: Role,
  write: (token: string) => Promise<ApiResult<ActionResponse>>,
  read: (token: string) => Promise<ApiResult<StoreApplication>>,
  toError: (failure: ApiFailure) => ActionError = generalError,
  // The page to mark as changed: the one NOT showing the result (see below).
  other: string = role === "admin" ? "/admin/stores" : "/seller",
): Result {
  const token = await getSessionToken();
  const user = token ? await getCurrentUser() : null;
  if (!token || !user) return fail(error("UNAUTHENTICATED", "Please login to continue."));
  if (user.role !== role) return fail(forbidden(role));

  const res = await write(token);
  if (!res.ok) {
    if (res.error.code === "UNAUTHENTICATED") await clearSession();
    if (res.error.code === "FORBIDDEN") return fail(forbidden(role));
    return fail(toError(res.error));
  }
  // Mark the other page (dashboard / queue) as changed. Not the current page: the
  // read below already has the new state, and re-rendering it would read again.
  // Next also refreshes visited pages when you go back to them.
  revalidatePath(other);
  const fresh = await read(token);
  // The change is saved either way; only showing it failed.
  if (!fresh.ok) return fail(error("RELOAD_FAILED", `${res.data?.message ?? "Saved."} Reload the page to see the change.`));
  return { ok: true, data: fresh.data };
}

function storeError(failure: ApiFailure): ActionError {
  const field = STORE_FIELD_OF[failure.code];
  if (field) return { code: failure.code, message: failure.message, fieldErrors: { [field]: failure.message } };
  if (failure.code === "FILE_TOO_LARGE" || failure.status === 413) return { code: "IMAGE_TOO_LARGE", message: "The logo must be at most 2 MB.", fieldErrors: { logo: "The logo must be at most 2 MB." } };
  return generalError(failure);
}

function exceptionError(failure: ApiFailure): ActionError {
  if (failure.code === "INVALID_EXCEPTION_DATE") return { code: failure.code, message: failure.message, fieldErrors: { date: failure.message } };
  // The backend names the time fields; the form shows times as one row.
  const fieldErrors: Record<string, string> = {};
  for (const [field, message] of Object.entries(failure.fieldErrors)) fieldErrors[/opensAt|closesAt|timesConsistent/.test(field) ? "times" : field] ??= message;
  return { code: failure.code, message: failure.message, fieldErrors };
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
