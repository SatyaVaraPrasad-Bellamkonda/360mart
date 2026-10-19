// Store application rules, the same as the backend's StoreRequest.java,
// StoreDayHoursRequest, StoreDocumentRequest and ReviewDecisionRequest (checked in
// the browser for instant feedback, again in the server action, and finally by
// the backend). Format only: completeness is the backend's checklist, at submit.
// Safe for client components.

import { collapse, insideIndia, isIndianState, round6 } from "@/lib/addresses/validation";
import { normalizeMobile } from "@/lib/auth/validation";
import { CATALOG_NAME, SAFE_LINE, SAFE_MULTILINE, SLUG, slugFromName } from "@/lib/catalog/validation";
import {
  DAYS,
  DOCUMENT_TYPES,
  type DayHoursDraft,
  type DayHoursInput,
  type DocumentDraft,
  type DocumentErrors,
  type DocumentInput,
  type DocumentType,
  type HoursExceptionDraft,
  type HoursExceptionErrors,
  type HoursExceptionInput,
  type Store,
  type StoreDraft,
  type StoreErrors,
  type StoreHours,
  type StoreInput,
} from "./types";

export const STORE_LIMITS = {
  name: 100,
  slug: 80,
  description: 1000,
  contactEmail: 254,
  addressLine1: 200,
  addressLine2: 200,
  landmark: 150,
  area: 100,
  city: 100,
  documentNumber: 50,
  reason: 500,
  minRadius: 0.5,
  maxRadius: 15,
} as const;

export const LOGO_TYPES = ["image/jpeg", "image/png"];
export const DOCUMENT_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"];
export const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;

const PLACE_NAME = /^[\p{L}\p{M}][\p{L}\p{M}\p{N} .'-]*$/u;
const PINCODE = /^[1-9][0-9]{5}$/;
const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const FSSAI = /^[0-9]{14}$/;
const DOCUMENT_NUMBER = /^[A-Za-z0-9/-]+$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONEY = /^\d{1,8}(\.\d{1,2})?$/;
const RADIUS = /^\d{1,2}(\.\d)?$/;

/** Today in India as YYYY-MM-DD (licences and documents must be valid today or later). */
export function todayInIndia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

/** The web address the store asks for: the typed one, else the one made from the name. */
export function storeSlug(draft: Pick<StoreDraft, "name" | "slug">): string | null {
  return draft.slug.trim() || slugFromName(collapse(draft.name), STORE_LIMITS.slug);
}

export function storeErrors(draft: StoreDraft): StoreErrors {
  const errors: StoreErrors = {};
  const name = collapse(draft.name);
  if (!name) errors.name = "Store name is required";
  else if (name.length > STORE_LIMITS.name) errors.name = `Store name must be at most ${STORE_LIMITS.name} characters`;
  else if (!CATALOG_NAME.test(name)) errors.name = "Store name can contain letters, digits, spaces and & , . ' ( ) / -";

  const slug = draft.slug.trim();
  if (slug.length > STORE_LIMITS.slug) errors.slug = `Web address must be at most ${STORE_LIMITS.slug} characters`;
  else if (slug && !SLUG.test(slug)) errors.slug = "Use only lowercase letters, digits and single hyphens (e.g. sri-balaji-mart)";
  else if (name && !errors.name && !storeSlug(draft)) errors.slug = "Could not make a web address from this name. Please type one (e.g. sri-balaji-mart).";

  const description = draft.description.trim();
  if (description.length > STORE_LIMITS.description) errors.description = `Description must be at most ${STORE_LIMITS.description} characters`;
  else if (!SAFE_MULTILINE.test(description)) errors.description = "Description contains characters that are not allowed";

  if (draft.contactPhone.trim() && !normalizeMobile(draft.contactPhone)) errors.contactPhone = "Enter a valid 10-digit Indian mobile number for the store";
  const email = draft.contactEmail.trim();
  if (email.length > STORE_LIMITS.contactEmail) errors.contactEmail = "Email must be at most 254 characters";
  else if (email && !EMAIL.test(email)) errors.contactEmail = "Enter a valid email address";

  const line = (key: "addressLine1" | "addressLine2" | "landmark", label: string) => {
    const value = collapse(draft[key]);
    if (value.length > STORE_LIMITS[key]) errors[key] = `${label} must be at most ${STORE_LIMITS[key]} characters`;
    else if (!SAFE_LINE.test(value)) errors[key] = `${label} contains characters that are not allowed`;
  };
  line("addressLine1", "Address line 1");
  line("addressLine2", "Address line 2");
  line("landmark", "Landmark");

  const place = (key: "area" | "city", label: string) => {
    const value = collapse(draft[key]);
    if (value.length > STORE_LIMITS[key]) errors[key] = `${label} must be at most ${STORE_LIMITS[key]} characters`;
    else if (value && !PLACE_NAME.test(value)) errors[key] = `Enter a valid ${label.toLowerCase()} name`;
  };
  place("area", "Area");
  place("city", "City");

  if (draft.state && !isIndianState(draft.state)) errors.state = "Choose a valid Indian state or union territory";
  const pincode = draft.pincode.trim();
  if (pincode && !PINCODE.test(pincode)) errors.pincode = "Enter a valid 6-digit pincode";
  if (draft.pin && !insideIndia(draft.pin)) errors.pin = "The pin must be inside India";

  const radius = draft.deliveryRadiusKm.trim();
  if (radius) {
    const km = Number(radius);
    if (!RADIUS.test(radius) || !Number.isFinite(km)) errors.deliveryRadiusKm = "Enter the radius in km, with at most 1 decimal place";
    else if (km < STORE_LIMITS.minRadius) errors.deliveryRadiusKm = "Delivery radius must be at least 0.5 km";
    else if (km > STORE_LIMITS.maxRadius) errors.deliveryRadiusKm = "Delivery radius can be at most 15 km";
  }

  const gstin = draft.gstin.trim().toUpperCase();
  if (gstin && !GSTIN.test(gstin)) errors.gstin = "Enter a valid 15-character GSTIN";

  const fssai = draft.fssaiLicenseNo.trim();
  if (fssai && !FSSAI.test(fssai)) errors.fssaiLicenseNo = "FSSAI licence number must be 14 digits";
  const validUntil = draft.fssaiValidUntil.trim();
  if (validUntil && !DATE.test(validUntil)) errors.fssaiValidUntil = "Enter a valid date";
  else if (validUntil && validUntil < todayInIndia()) errors.fssaiValidUntil = "The FSSAI licence has expired";
  else if (fssai && !validUntil) errors.fssaiValidUntil = "Enter the FSSAI licence's valid-until date";

  const money = (key: "minOrderAmount" | "deliveryFee", label: string) => {
    const value = draft[key].trim();
    if (value && !MONEY.test(value)) errors[key] = `${label} must be 0 or more, with at most 2 decimal places`;
  };
  money("minOrderAmount", "Minimum order amount");
  money("deliveryFee", "Delivery fee");

  return errors;
}

/** Every field, every time: PUT replaces the whole store, and a missing field would be cleared. */
export function toStoreInput(draft: StoreDraft): StoreInput {
  const optional = (value: string) => collapse(value) || null;
  const number = (value: string) => (value.trim() ? Number(value.trim()) : null);
  const phone = normalizeMobile(draft.contactPhone);
  return {
    name: collapse(draft.name),
    slug: storeSlug(draft),
    description: draft.description.trim() || null,
    contactPhone: phone ? `+91${phone}` : null,
    contactEmail: draft.contactEmail.trim().toLowerCase() || null,
    addressLine1: optional(draft.addressLine1),
    addressLine2: optional(draft.addressLine2),
    landmark: optional(draft.landmark),
    area: optional(draft.area),
    city: optional(draft.city),
    state: draft.state || null,
    pincode: draft.pincode.trim() || null,
    latitude: draft.pin ? round6(draft.pin.latitude) : null,
    longitude: draft.pin ? round6(draft.pin.longitude) : null,
    deliveryRadiusKm: number(draft.deliveryRadiusKm),
    gstin: draft.gstin.trim().toUpperCase() || null,
    fssaiLicenseNo: draft.fssaiLicenseNo.trim() || null,
    fssaiValidUntil: draft.fssaiValidUntil.trim() || null,
    minOrderAmount: number(draft.minOrderAmount),
    deliveryFee: number(draft.deliveryFee),
  };
}

export function toStoreDraft(store: Store): StoreDraft {
  const text = (value: string | null) => value ?? "";
  const amount = (value: number | null) => (value === null || value === undefined ? "" : String(value));
  return {
    name: store.name,
    // Empty = keep following the name; a different saved address stays as it is.
    slug: store.slug === slugFromName(collapse(store.name), STORE_LIMITS.slug) ? "" : store.slug,
    description: text(store.description),
    contactPhone: text(store.contactPhone).replace(/^\+91/, ""),
    contactEmail: text(store.contactEmail),
    addressLine1: text(store.addressLine1),
    addressLine2: text(store.addressLine2),
    landmark: text(store.landmark),
    area: text(store.area),
    city: text(store.city),
    state: text(store.state),
    pincode: text(store.pincode),
    pin: store.latitude != null && store.longitude != null ? { latitude: store.latitude, longitude: store.longitude } : null,
    deliveryRadiusKm: amount(store.deliveryRadiusKm),
    gstin: text(store.gstin),
    fssaiLicenseNo: text(store.fssaiLicenseNo),
    fssaiValidUntil: text(store.fssaiValidUntil),
    minOrderAmount: amount(store.minOrderAmount),
    deliveryFee: amount(store.deliveryFee),
  };
}

/** A new application: the owner's own number as the store's contact (they can change it). */
export function emptyStoreDraft(contactPhone = ""): StoreDraft {
  return {
    name: "",
    slug: "",
    description: "",
    contactPhone: contactPhone.replace(/^\+91/, ""),
    contactEmail: "",
    addressLine1: "",
    addressLine2: "",
    landmark: "",
    area: "",
    city: "",
    state: "",
    pincode: "",
    pin: null,
    deliveryRadiusKm: "3",
    gstin: "",
    fssaiLicenseNo: "",
    fssaiValidUntil: "",
    minOrderAmount: "0",
    deliveryFee: "0",
  };
}

/** Rebuilds a draft from untrusted action input (anything from the browser can be forged). */
export function readStoreDraft(input: unknown): StoreDraft | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const draft = emptyStoreDraft();
  for (const key of Object.keys(draft) as (keyof StoreDraft)[]) {
    if (key === "pin") continue;
    (draft as Record<string, unknown>)[key] = typeof raw[key] === "string" ? raw[key] : "";
  }
  const pin = raw.pin as Record<string, unknown> | null | undefined;
  if (pin && typeof pin === "object" && typeof pin.latitude === "number" && typeof pin.longitude === "number") {
    draft.pin = { latitude: pin.latitude, longitude: pin.longitude };
  }
  return draft;
}

// Backend field names → form fields (the pin is one field in the form).
const FIELD_ALIASES: Record<string, keyof StoreErrors> = {
  latitude: "pin",
  longitude: "pin",
  coordinatesComplete: "pin",
  fssaiComplete: "fssaiValidUntil",
};

export function storeFieldErrors(fieldErrors: Record<string, string>): StoreErrors {
  const errors: StoreErrors = {};
  const known = new Set<string>([...Object.keys(emptyStoreDraft()), "logo"]);
  for (const [field, message] of Object.entries(fieldErrors)) {
    const key = FIELD_ALIASES[field] ?? field;
    if (known.has(key)) errors[key as keyof StoreErrors] ??= message;
  }
  return errors;
}

// The checklist's missingDetails labels (Store.missingDetails in the backend) → form fields to highlight.
const MISSING_FIELD: Record<string, keyof StoreDraft> = {
  "store contact number": "contactPhone",
  "address line 1": "addressLine1",
  area: "area",
  city: "city",
  state: "state",
  pincode: "pincode",
  "map location": "pin",
  "delivery radius": "deliveryRadiusKm",
  "fssai licence number": "fssaiLicenseNo",
  "fssai licence valid-until date": "fssaiValidUntil",
};

/** "Needed to submit" markers for the details form, from the backend's checklist. */
export function missingFields(missingDetails: string[]): Partial<Record<keyof StoreDraft, true>> {
  const fields: Partial<Record<keyof StoreDraft, true>> = {};
  for (const label of missingDetails) {
    const field = MISSING_FIELD[label.trim().toLowerCase()];
    if (field) fields[field] = true;
  }
  return fields;
}

export function logoError(file: { type: string; size: number }): string | undefined {
  if (!LOGO_TYPES.includes(file.type)) return "Use a JPEG or PNG image.";
  if (file.size > 2 * 1024 * 1024) return "The logo must be at most 2 MB.";
  return undefined;
}

// ---- opening hours ----

const DEFAULT_OPENS = "09:00";
const DEFAULT_CLOSES = "21:00";

/** The form's 7 rows: saved days as they are, unsaved days open 9 to 9 (the owner checks before saving). */
export function toHoursDraft(hours: StoreHours[]): DayHoursDraft[] {
  return DAYS.map((day) => {
    const saved = hours.find((h) => h.dayOfWeek === day);
    if (!saved) return { dayOfWeek: day, open: true, opensAt: DEFAULT_OPENS, closesAt: DEFAULT_CLOSES };
    return {
      dayOfWeek: day,
      open: !saved.isClosed,
      opensAt: saved.opensAt?.slice(0, 5) ?? DEFAULT_OPENS,
      closesAt: saved.closesAt?.slice(0, 5) ?? DEFAULT_CLOSES,
    };
  });
}

/** One message per day that's wrong, keyed by day. */
export function hoursErrors(days: DayHoursDraft[]): Partial<Record<DayHoursDraft["dayOfWeek"], string>> {
  const errors: Partial<Record<DayHoursDraft["dayOfWeek"], string>> = {};
  for (const day of days) {
    if (!day.open) continue;
    if (!TIME.test(day.opensAt) || !TIME.test(day.closesAt)) errors[day.dayOfWeek] = "Enter both times";
    else if (day.closesAt <= day.opensAt) errors[day.dayOfWeek] = "Closing time must be after opening time (past midnight isn't supported yet)";
  }
  return errors;
}

export function toHoursInput(days: DayHoursDraft[]): DayHoursInput[] {
  return days.map((day) => (day.open ? { dayOfWeek: day.dayOfWeek, isClosed: false, opensAt: day.opensAt, closesAt: day.closesAt } : { dayOfWeek: day.dayOfWeek, isClosed: true }));
}

/** Untrusted input → exactly the 7 days, each once, or null. */
export function readHoursDraft(input: unknown): DayHoursDraft[] | null {
  if (!Array.isArray(input) || input.length !== DAYS.length) return null;
  const days: DayHoursDraft[] = [];
  for (const day of DAYS) {
    const raw = input.find((d) => d && typeof d === "object" && (d as Record<string, unknown>).dayOfWeek === day) as Record<string, unknown> | undefined;
    if (!raw) return null;
    days.push({
      dayOfWeek: day,
      open: raw.open === true,
      opensAt: typeof raw.opensAt === "string" ? raw.opensAt : "",
      closesAt: typeof raw.closesAt === "string" ? raw.closesAt : "",
    });
  }
  return days;
}

/** "7:00 am" from "07:00" or "07:00:00". */
export function timeText(value: string | null): string {
  if (!value) return "";
  const [h, m] = value.slice(0, 5).split(":").map(Number);
  const suffix = h < 12 ? "am" : "pm";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

// ---- holidays and special hours (one date overrides the weekly hours) ----

/** How far ahead a date can be set (the backend's MAX_HOURS_EXCEPTION_DAYS_AHEAD). */
export const EXCEPTION_DAYS_AHEAD = 365;

/** YYYY-MM-DD `days` after `date` (calendar days, no time zone involved). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function exceptionErrors(draft: HoursExceptionDraft): HoursExceptionErrors {
  const errors: HoursExceptionErrors = {};
  const today = todayInIndia();
  if (!DATE.test(draft.date)) errors.date = "Choose a date";
  else if (draft.date < today) errors.date = "Choose today or a later date";
  else if (draft.date > addDays(today, EXCEPTION_DAYS_AHEAD)) errors.date = "Choose a date within the next 12 months";
  if (!draft.isClosed) {
    if (!TIME.test(draft.opensAt) || !TIME.test(draft.closesAt)) errors.times = "Enter both times";
    else if (draft.closesAt <= draft.opensAt) errors.times = "Closing time must be after opening time (past midnight isn't supported yet)";
  }
  const reason = collapse(draft.reason);
  if (reason.length > 150) errors.reason = "Reason must be at most 150 characters";
  else if (!SAFE_LINE.test(reason)) errors.reason = "Reason contains characters that are not allowed";
  return errors;
}

export function toExceptionInput(draft: HoursExceptionDraft): HoursExceptionInput {
  const base = { ...(draft.exceptionId ? { exceptionId: draft.exceptionId } : {}), date: draft.date, reason: collapse(draft.reason) || null };
  return draft.isClosed ? { ...base, isClosed: true } : { ...base, isClosed: false, opensAt: draft.opensAt, closesAt: draft.closesAt };
}

export function readExceptionDraft(input: unknown): HoursExceptionDraft | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const str = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string) : "");
  const id = raw.exceptionId;
  return {
    exceptionId: typeof id === "number" && Number.isSafeInteger(id) && id > 0 ? id : null,
    date: str("date"),
    isClosed: raw.isClosed !== false,
    opensAt: str("opensAt"),
    closesAt: str("closesAt"),
    reason: str("reason"),
  };
}

/** "Mon, 20 Oct" (and the year when it isn't this year). */
export function shortDateText(date: string, today = todayInIndia()): string {
  const d = new Date(`${date}T00:00:00+05:30`);
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }), timeZone: "Asia/Kolkata" }).format(d);
}

// ---- documents ----

export function documentErrors(draft: DocumentDraft, file: File | { type: string; size: number } | null): DocumentErrors {
  const errors: DocumentErrors = {};
  const number = draft.documentNumber.trim();
  if (number.length > STORE_LIMITS.documentNumber) errors.documentNumber = "Document number must be at most 50 characters";
  else if (number && !DOCUMENT_NUMBER.test(number)) errors.documentNumber = "Use only letters, digits, / and -";
  const until = draft.validUntil.trim();
  if (until && !DATE.test(until)) errors.validUntil = "Enter a valid date";
  else if (until && until < todayInIndia()) errors.validUntil = "This document has expired";
  if (!file) errors.file = "Choose the file to upload";
  else if (!DOCUMENT_FILE_TYPES.includes(file.type)) errors.file = "Upload a PDF, JPEG or PNG file";
  else if (file.size > DOCUMENT_MAX_BYTES) errors.file = "The document must be at most 5 MB";
  return errors;
}

export function toDocumentInput(draft: DocumentDraft): DocumentInput {
  return { documentType: draft.documentType, documentNumber: draft.documentNumber.trim() || null, validUntil: draft.validUntil.trim() || null };
}

export function readDocumentDraft(input: unknown): DocumentDraft | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  if (!DOCUMENT_TYPES.includes(raw.documentType as DocumentType)) return null;
  return {
    documentType: raw.documentType as DocumentType,
    documentNumber: typeof raw.documentNumber === "string" ? raw.documentNumber : "",
    validUntil: typeof raw.validUntil === "string" ? raw.validUntil : "",
  };
}

// ---- admin review ----

export function reasonError(reason: string): string | undefined {
  const text = collapse(reason);
  if (!text) return "Give a reason, so the shopkeeper knows what to fix";
  if (text.length > STORE_LIMITS.reason) return "Reason must be at most 500 characters";
  if (!SAFE_LINE.test(text)) return "Reason contains characters that are not allowed";
  return undefined;
}

/** "18 Oct 2026" in India time. */
export function dateText(iso: string | null): string {
  if (!iso) return "";
  const date = DATE.test(iso) ? new Date(`${iso}T00:00:00+05:30`) : new Date(iso);
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(date);
}

/** "18 Oct 2026, 2:35 pm" in India time. */
export function dateTimeText(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(iso));
}
