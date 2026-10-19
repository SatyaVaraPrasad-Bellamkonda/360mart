// JSON shapes and fixed values of the Spring Boot store APIs (/api/v1/seller/store,
// /api/v1/admin/stores). Types and constants only, so client components may import them too.

import type { Coordinates } from "@/lib/addresses/types";

export type StoreStatus = "DRAFT" | "PENDING_APPROVAL" | "ACTIVE" | "REJECTED" | "SUSPENDED" | "CLOSED";

export const STORE_STATUS_LABEL: Record<StoreStatus, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Under review",
  ACTIVE: "Live",
  REJECTED: "Changes needed",
  SUSPENDED: "Suspended",
  CLOSED: "Closed",
};

/** Complete Tailwind classes per status (never built from parts). */
export const STORE_STATUS_TONE: Record<StoreStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING_APPROVAL: "bg-amber-100 text-amber-800",
  ACTIVE: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  SUSPENDED: "bg-red-100 text-red-800",
  CLOSED: "bg-slate-100 text-slate-700",
};

/** The owner can change the application only in these. */
export const EDITABLE_STATUSES: readonly StoreStatus[] = ["DRAFT", "REJECTED"];

export const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
export type DayOfWeek = (typeof DAYS)[number];

export const DAY_LABEL: Record<DayOfWeek, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

export const DOCUMENT_TYPES = ["FSSAI_LICENSE", "GST_CERTIFICATE", "PAN_CARD", "SHOP_ESTABLISHMENT", "CANCELLED_CHEQUE"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

// Same wording as the backend's StoreDocumentType labels.
export const DOCUMENT_LABEL: Record<DocumentType, string> = {
  FSSAI_LICENSE: "FSSAI licence",
  GST_CERTIFICATE: "GST certificate",
  PAN_CARD: "PAN card",
  SHOP_ESTABLISHMENT: "Shop establishment certificate",
  CANCELLED_CHEQUE: "Cancelled cheque",
};

export const DOCUMENT_HINT: Record<DocumentType, string> = {
  FSSAI_LICENSE: "Needed to sell food. The licence or registration certificate.",
  GST_CERTIFICATE: "Needed when you enter a GSTIN.",
  PAN_CARD: "The PAN card of the business or owner.",
  SHOP_ESTABLISHMENT: "Shop and establishment registration from your municipality.",
  CANCELLED_CHEQUE: "For payouts to your bank account.",
};

export type DocumentStatus = "PENDING" | "VERIFIED" | "REJECTED";
/** A required document's state in the checklist: MISSING = nothing uploaded yet. */
export type RequiredDocumentState = "MISSING" | DocumentStatus;

export type Store = {
  storeId: string;
  ownerUserId: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null; // signed link (~1 hour); never store it
  contactPhone: string | null; // "+919876543210"
  contactEmail: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  landmark: string | null;
  area: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  deliveryRadiusKm: number | null;
  gstin: string | null;
  fssaiLicenseNo: string | null;
  fssaiValidUntil: string | null; // YYYY-MM-DD
  status: StoreStatus;
  isAcceptingOrders: boolean;
  rejectionReason: string | null;
  approvedAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  minOrderAmount: number | null;
  deliveryFee: number | null;
  createdAt: string;
  updatedAt: string;
};

export type StoreHours = {
  dayOfWeek: DayOfWeek;
  isClosed: boolean;
  opensAt: string | null; // "07:00:00" (show the first 5 characters)
  closesAt: string | null;
};

/** One date that overrides the weekly hours (a holiday, or different timings). */
export type HoursException = {
  exceptionId: number;
  date: string; // YYYY-MM-DD
  isClosed: boolean;
  opensAt: string | null; // "09:00:00" (show the first 5 characters)
  closesAt: string | null;
  reason: string | null; // shown to customers ("Closed today for Diwali")
};

/** Body of PUT /seller/store/hours/exceptions: add or update (by date), or delete (id + date). */
export type HoursExceptionInput =
  | { exceptionId?: number; date: string; isClosed: true; reason: string | null }
  | { exceptionId?: number; date: string; isClosed: false; opensAt: string; closesAt: string; reason: string | null }
  | { exceptionId: number; date: string; delete: true };

/** The add / edit form's values. */
export type HoursExceptionDraft = { exceptionId: number | null; date: string; isClosed: boolean; opensAt: string; closesAt: string; reason: string };
export type HoursExceptionErrors = Partial<Record<"date" | "times" | "reason", string>>;

export type StoreDocument = {
  documentId: string;
  documentType: DocumentType;
  documentNumber: string | null;
  fileUrl: string | null; // signed link (~1 hour); null while storage is down
  status: DocumentStatus;
  rejectionReason: string | null;
  verifiedAt: string | null;
  validUntil: string | null;
  createdAt: string;
};

export type StoreChecklist = {
  detailsComplete: boolean;
  missingDetails: string[]; // labels like "area", "map location"
  hoursSet: boolean;
  requiredDocuments: { documentType: DocumentType; label: string; status: RequiredDocumentState }[];
  readyToSubmit: boolean;
  missingSteps: string[]; // ready-made sentences
};

/** What every owner call returns, and the admin's GET one. */
export type StoreApplication = {
  store: Store;
  hours: StoreHours[]; // Monday first
  hoursExceptions?: HoursException[]; // upcoming dates only, soonest first (absent from older backends)
  documents: StoreDocument[]; // newest first; rejected ones stay
  checklist: StoreChecklist;
};

/** The "store" part of POST / PUT /seller/store. PUT replaces every field, so all are sent. */
export type StoreInput = {
  name: string;
  slug: string | null;
  description: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  landmark: string | null;
  area: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  deliveryRadiusKm: number | null;
  gstin: string | null;
  fssaiLicenseNo: string | null;
  fssaiValidUntil: string | null;
  minOrderAmount: number | null;
  deliveryFee: number | null;
};

/** The details form's values: text as typed, the map pin as coordinates. */
export type StoreDraft = {
  name: string;
  slug: string;
  description: string;
  contactPhone: string;
  contactEmail: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  pin: Coordinates | null;
  deliveryRadiusKm: string;
  gstin: string;
  fssaiLicenseNo: string;
  fssaiValidUntil: string;
  minOrderAmount: string;
  deliveryFee: string;
};

export type StoreField = keyof StoreDraft | "logo";
export type StoreErrors = Partial<Record<StoreField, string>>;

export type DayHoursInput = { dayOfWeek: DayOfWeek; isClosed: boolean; opensAt?: string; closesAt?: string };

/** One row of the hours form ("HH:MM" times, kept while a day is closed so reopening restores them). */
export type DayHoursDraft = { dayOfWeek: DayOfWeek; open: boolean; opensAt: string; closesAt: string };

export type DocumentInput = { documentType: DocumentType; documentNumber: string | null; validUntil: string | null };
export type DocumentDraft = { documentType: DocumentType; documentNumber: string; validUntil: string };
export type DocumentErrors = Partial<Record<"documentNumber" | "validUntil" | "file", string>>;

/** Body of the admin's document and store reviews. */
export type ReviewDecision = { approved: true } | { approved: false; reason: string };
