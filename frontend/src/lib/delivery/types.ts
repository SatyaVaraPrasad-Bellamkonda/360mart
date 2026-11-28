// JSON shapes of 360mart delivery (backend handoff "delivery partners",
// 2026-11-28): the rider's application and history, the store's delivery panel
// on an order, the customer's live tracking and the admin's riders + settings.
// Types, labels and the vehicle-number rule only, so client components may
// import this file too. Money is in rupees as sent; times are UTC instants.

import type { Page } from "@/lib/inventory/types";
import type { OrderStatus, PaymentMethod, UndeliveredReason } from "@/lib/orders/types";

export type { Page };

// ---- vehicles ----

export const VEHICLE_TYPES = ["BICYCLE", "E_BICYCLE", "E_SCOOTER", "SCOOTER", "MOTORCYCLE", "THREE_WHEELER"] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];
export const isVehicleType = (v: unknown): v is VehicleType => typeof v === "string" && (VEHICLE_TYPES as readonly string[]).includes(v);

export const VEHICLE_LABEL: Record<VehicleType, string> = {
  BICYCLE: "Bicycle",
  E_BICYCLE: "E-bicycle",
  E_SCOOTER: "E-scooter",
  SCOOTER: "Scooter",
  MOTORCYCLE: "Motorcycle",
  THREE_WHEELER: "Three-wheeler",
};
export const vehicleLabel = (v: VehicleType | null | undefined) => (v ? (VEHICLE_LABEL[v] ?? v) : null);

/** The backend's VEHICLE_NUMBER pattern (after removing spaces, dots and dashes and upper-casing). */
const VEHICLE_NUMBER = /^([A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2})$/;
export const VEHICLE_NUMBER_MAX = 15;

/** "ka-01 ab 1234" → "KA01AB1234" (the backend keeps it this way); "" → null. */
export function normalizeVehicleNumber(input: unknown): string | null {
  const clean = typeof input === "string" ? input.replace(/[\s.-]/g, "").toUpperCase() : "";
  return clean || null;
}

/** Same rule and words as the backend. Empty is allowed here: whether the vehicle needs one is checked at submit. */
export function vehicleNumberError(input: unknown): string | undefined {
  const n = normalizeVehicleNumber(input);
  if (!n) return undefined;
  if (n.length > VEHICLE_NUMBER_MAX) return "Vehicle number is too long";
  if (!VEHICLE_NUMBER.test(n)) return "Enter the vehicle number like KA01AB1234";
  return undefined;
}

// ---- the rider's account ----

export type RiderStatus = "ONBOARDING" | "PENDING_APPROVAL" | "ACTIVE" | "REJECTED" | "SUSPENDED";
export const RIDER_STATUSES: RiderStatus[] = ["PENDING_APPROVAL", "ACTIVE", "ONBOARDING", "REJECTED", "SUSPENDED"];
/** Vehicle and documents can be changed. */
export const isEditable = (s: RiderStatus) => s === "ONBOARDING" || s === "REJECTED";

export const RIDER_STATUS_LABEL: Record<RiderStatus, string> = {
  ONBOARDING: "Application started",
  PENDING_APPROVAL: "Under review",
  ACTIVE: "Approved",
  REJECTED: "Changes needed",
  SUSPENDED: "Suspended",
};
export const RIDER_STATUS_TONE: Record<RiderStatus, string> = {
  ONBOARDING: "bg-slate-100 text-slate-700",
  PENDING_APPROVAL: "bg-amber-100 text-amber-800",
  ACTIVE: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  SUSPENDED: "bg-red-100 text-red-800",
};

export const RIDER_DOCUMENT_TYPES = ["ID_PROOF", "DRIVING_LICENCE", "VEHICLE_RC"] as const;
export type RiderDocumentType = (typeof RIDER_DOCUMENT_TYPES)[number];
export const RIDER_DOCUMENT: Record<RiderDocumentType, { label: string; hint: string }> = {
  ID_PROOF: { label: "ID proof", hint: "Aadhaar, PAN, voter ID or passport" },
  DRIVING_LICENCE: { label: "Driving licence", hint: "Front side, all text readable" },
  VEHICLE_RC: { label: "Vehicle RC", hint: "Registration certificate of this vehicle" },
};
/** ID proof always; licence and RC only for vehicles that need a licence. */
export const requiredDocuments = (licenceRequired: boolean): RiderDocumentType[] => (licenceRequired ? ["ID_PROOF", "DRIVING_LICENCE", "VEHICLE_RC"] : ["ID_PROOF"]);

export type RiderDocumentStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type RiderDocument = {
  documentId: string;
  documentType: RiderDocumentType;
  status: RiderDocumentStatus;
  rejectionReason: string | null;
  uploadedAt: string;
  /** Signed link, about an hour. */
  url: string | null;
  urlExpiresAt: string | null;
};

export const RIDER_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"];
export const RIDER_FILE_MAX_BYTES = 5 * 1024 * 1024;
export function riderFileError(file: File): string | undefined {
  if (!RIDER_FILE_TYPES.includes(file.type)) return "Choose a PDF, JPEG or PNG file.";
  if (file.size > RIDER_FILE_MAX_BYTES) return "The file must be at most 5 MB.";
  return undefined;
}

/** GET /rider/profile. */
export type RiderProfile = {
  riderId: string;
  status: RiderStatus;
  vehicleType: VehicleType | null;
  vehicleNumber: string | null;
  licenceRequired: boolean;
  rejectionReason: string | null;
  suspensionReason: string | null;
  online: boolean;
  cashInHand: number;
  cashLimit: number | null;
  documents: RiderDocument[];
  /** Ready-to-show sentences. */
  missingSteps: string[];
  canSubmit: boolean;
  submittedAt: string | null;
  approvedAt: string | null;
};

// ---- deliveries ----

export type DeliveryTaskStatus = "SEARCHING" | "OFFERED" | "ASSIGNED" | "AT_STORE" | "PICKUP_PENDING" | "PICKED_UP" | "AT_CUSTOMER" | "DELIVERED" | "RETURNING" | "RETURNED" | "CANCELLED";

export const TASK_STATUS_LABEL: Record<DeliveryTaskStatus, string> = {
  SEARCHING: "Finding a rider",
  OFFERED: "Offered to a rider",
  ASSIGNED: "Rider on the way to the store",
  AT_STORE: "Rider at the store",
  PICKUP_PENDING: "Waiting for handover",
  PICKED_UP: "On the way",
  AT_CUSTOMER: "At the customer",
  DELIVERED: "Delivered",
  RETURNING: "Coming back",
  RETURNED: "Returned",
  CANCELLED: "Called off",
};
export const TASK_STATUS_TONE: Record<DeliveryTaskStatus, string> = {
  SEARCHING: "bg-amber-100 text-amber-800",
  OFFERED: "bg-amber-100 text-amber-800",
  ASSIGNED: "bg-sky-100 text-sky-800",
  AT_STORE: "bg-sky-100 text-sky-800",
  PICKUP_PENDING: "bg-indigo-100 text-indigo-800",
  PICKED_UP: "bg-violet-100 text-violet-800",
  AT_CUSTOMER: "bg-violet-100 text-violet-800",
  DELIVERED: "bg-green-100 text-green-800",
  RETURNING: "bg-orange-100 text-orange-800",
  RETURNED: "bg-slate-100 text-slate-700",
  CANCELLED: "bg-slate-100 text-slate-700",
};
export const isTaskFinished = (s: DeliveryTaskStatus | null | undefined) => s === "DELIVERED" || s === "RETURNED" || s === "CANCELLED";
/** A rider accepted and hasn't collected it yet: the order can still be taken back. */
export const isBeforePickup = (s: DeliveryTaskStatus | null | undefined) => s === "ASSIGNED" || s === "AT_STORE" || s === "PICKUP_PENDING";

export type StoreDeliveryAction = "ASSIGN_RIDER" | "CONFIRM_HANDOVER" | "CONFIRM_RETURN" | "DELIVER_MYSELF";
export type OfferSource = "AUTO" | "STORE" | "ADMIN";

export type DeliveryRider = {
  riderId: string;
  firstName: string | null;
  /** Only while the rider is on the order. */
  phone: string | null;
  vehicleType: VehicleType | null;
  vehicleNumber: string | null;
  latitude: number | null;
  longitude: number | null;
  locationAt: string | null;
};

/** GET /seller/store/orders/{id}/delivery and GET /admin/orders/{id}/delivery. */
export type StoreDelivery = {
  /** null = no rider search yet. */
  taskId: string | null;
  status: DeliveryTaskStatus | null;
  searchingSince: string | null;
  offer: { firstName: string | null; vehicleType: VehicleType | null; source: OfferSource; expiresAt: string } | null;
  rider: DeliveryRider | null;
  pickupPhotoUrl: string | null;
  acceptedAt: string | null;
  atStoreAt: string | null;
  pickupRequestedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  failedReason: UndeliveredReason | null;
  returnedAt: string | null;
  cancelReason: string | null;
  allowedActions: StoreDeliveryAction[];
};

/** GET …/delivery/riders: free riders near the store. */
export type AvailableRider = { riderId: string; firstName: string | null; vehicleType: VehicleType | null; distanceKm: number | null; lastSeenAt: string | null };

export type TrackingPoint = { latitude: number; longitude: number; recordedAt: string | null };

/** GET /orders/{orderId}/tracking (the shopper). */
export type DeliveryTracking = {
  orderStatus: OrderStatus;
  deliveryStatus: DeliveryTaskStatus | null;
  riderFirstName: string | null;
  vehicleType: VehicleType | null;
  /** Only while on the way and only when fresh. */
  riderLocation: TrackingPoint | null;
  store: TrackingPoint | null;
  destination: TrackingPoint | null;
  /** Straight-line estimate: say "about". */
  etaMinutes: number | null;
};

/** One row of GET /rider/tasks. */
export type RiderTaskSummary = { taskId: string; orderNumber: string; storeName: string; status: DeliveryTaskStatus; cashCollected: number | null; acceptedAt: string | null; finishedAt: string | null };

export type CashEntry = { type: "COLLECTED" | "DEPOSITED"; amount: number; balanceAfter: number; orderNumber: string | null; reference: string | null; createdAt: string };
/** GET /rider/cash and GET /admin/riders/{id}/cash. */
export type RiderCash = { cashInHand: number; cashLimit: number | null; entries: Page<CashEntry> };

/** The rider's current offer / task (GET /rider/current), only what the website shows. */
export type RiderCurrent = {
  status: RiderStatus;
  online: boolean;
  cashInHand: number;
  cashLimit: number | null;
  offer: { offerId: string; orderNumber: string; expiresAt: string } | null;
  task: { taskId: string; status: DeliveryTaskStatus; orderNumber: string; paymentMethod: PaymentMethod; amountToCollect: number | null; pickup: { name: string | null; area: string | null; city: string | null } | null } | null;
};

// ---- admin ----

export type AdminRiderSummary = {
  riderId: string;
  name: string | null;
  mobileNumber: string;
  status: RiderStatus;
  vehicleType: VehicleType | null;
  online: boolean;
  cashInHand: number;
  submittedAt: string | null;
  createdAt: string;
};

export type AdminRider = {
  riderId: string;
  userId: string;
  name: string | null;
  mobileNumber: string;
  email: string | null;
  status: RiderStatus;
  vehicleType: VehicleType | null;
  vehicleNumber: string | null;
  licenceRequired: boolean;
  rejectionReason: string | null;
  suspensionReason: string | null;
  online: boolean;
  cashInHand: number;
  /** null = the default limit applies. */
  cashLimit: number | null;
  effectiveCashLimit: number;
  documents: RiderDocument[];
  missingSteps: string[];
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
};

export type VehicleRule = { vehicleType: VehicleType; enabled: boolean; licenceRequired: boolean; maxDistanceKm: number; maxItems: number };

/** GET /admin/delivery/settings (PUT sends the same document without updatedAt). */
export type DeliverySettings = {
  defaultCashLimit: number;
  offerTimeoutSeconds: number;
  searchRadiusKm: number;
  locationFreshSeconds: number;
  retryIntervalSeconds: number;
  failedWaitMinutes: number;
  averageSpeedKmph: number;
  vehicles: VehicleRule[];
  updatedAt?: string | null;
};

/** Writes answer { success, message, id? }. */
export type DeliveryWrite = { success: boolean; message: string; id?: string };

export const REASON_MIN = 3;
export const REASON_MAX = 300;
