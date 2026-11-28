import { api, type ApiResult } from "@/lib/api-client";
import { isUuidLike } from "@/lib/inventory/validation";
import { refreshRiderPagesAction } from "./actions";
import { isVehicleType, normalizeVehicleNumber, riderFileError, vehicleNumberError, type DeliveryWrite, type RiderDocumentType, type RiderProfile } from "./types";

// The rider's application, called straight from the browser (/api/v1/rider/...):
// vehicle, documents, submit. Each write is followed by one GET /rider/profile
// so the screen shows the new checklist (missingSteps, canSubmit) at once.

function fail(code: string, message: string, fieldErrors: Record<string, string> = {}): ApiResult<never> {
  return { ok: false, error: { status: 0, code, message, fieldErrors, issues: [] } };
}

export const loadProfile = () => api<RiderProfile>("/rider/profile");

async function thenProfile(res: ApiResult<DeliveryWrite>): Promise<ApiResult<{ message: string; profile: RiderProfile | null }>> {
  if (!res.ok) return res;
  void refreshRiderPagesAction();
  const fresh = await loadProfile();
  return { ok: true, data: { message: res.data?.message ?? "Saved.", profile: fresh.ok ? fresh.data : null } };
}

export async function saveVehicle(vehicleType: unknown, vehicleNumber: unknown) {
  const errors: Record<string, string> = {};
  if (!isVehicleType(vehicleType)) errors.vehicleType = "Choose the vehicle you deliver with";
  const problem = vehicleNumberError(vehicleNumber);
  if (problem) errors.vehicleNumber = problem;
  if (Object.keys(errors).length) return fail("VALIDATION_FAILED", "Please fix the highlighted fields.", errors);
  return thenProfile(await api<DeliveryWrite>("/rider/profile", { method: "PUT", body: { vehicleType, vehicleNumber: normalizeVehicleNumber(vehicleNumber) } }));
}

export async function uploadRiderDocument(documentType: RiderDocumentType, file: File) {
  const problem = riderFileError(file);
  if (problem) return fail("VALIDATION_FAILED", problem, { file: problem });
  const form = new FormData();
  form.append("document", new Blob([JSON.stringify({ documentType })], { type: "application/json" }));
  form.append("file", file);
  const res = await api<DeliveryWrite>("/rider/profile/documents", { method: "POST", body: form });
  // Too big for the gateway, or storage busy: our own words.
  if (!res.ok && (res.error.status === 413 || res.error.code === "FILE_TOO_LARGE")) return fail("FILE_TOO_LARGE", "The file must be at most 5 MB.");
  if (!res.ok && (res.error.status === 502 || res.error.code === "STORAGE_UNAVAILABLE")) return fail(res.error.code, "File storage is busy right now. Please try again in a minute.");
  return thenProfile(res);
}

export async function removeRiderDocument(documentId: string) {
  if (!isUuidLike(documentId)) return fail("VALIDATION_FAILED", "Document not found.");
  return thenProfile(await api<DeliveryWrite>(`/rider/profile/documents/${encodeURIComponent(documentId)}`, { method: "DELETE" }));
}

export async function submitApplication() {
  return thenProfile(await api<DeliveryWrite>("/rider/profile/submit", { method: "POST" }));
}
