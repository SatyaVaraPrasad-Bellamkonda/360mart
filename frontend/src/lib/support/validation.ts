// The backend's rules for support requests, checked in the browser first and
// again in the server actions. Safe for client and server code.

export const SUPPORT_LIMITS = { descriptionMin: 10, descriptionMax: 2000, message: 2000, noteMin: 5, noteMax: 1000, photos: 3, photoBytes: 2 * 1024 * 1024, itemQty: 99 } as const;
export const PHOTO_TYPES = ["image/jpeg", "image/png"];

// Same as the backend's SAFE_MULTILINE: no < or > (nothing typed can turn into HTML).
const UNSAFE = /[<>]/;

export function descriptionError(text: string): string | undefined {
  const t = text.trim();
  if (!t) return "Tell us what happened";
  if (t.length < SUPPORT_LIMITS.descriptionMin || t.length > SUPPORT_LIMITS.descriptionMax) return `Write between ${SUPPORT_LIMITS.descriptionMin} and ${SUPPORT_LIMITS.descriptionMax} characters`;
  if (UNSAFE.test(t)) return "Remove special characters like < >";
  return undefined;
}

export function messageError(text: string): string | undefined {
  const t = text.trim();
  if (!t) return "Write a message";
  if (t.length > SUPPORT_LIMITS.message) return `At most ${SUPPORT_LIMITS.message} characters`;
  if (UNSAFE.test(t)) return "Remove special characters like < >";
  return undefined;
}

export function noteError(text: string): string | undefined {
  const t = text.trim();
  if (!t) return "Tell the customer what was done";
  if (t.length < SUPPORT_LIMITS.noteMin || t.length > SUPPORT_LIMITS.noteMax) return `Write between ${SUPPORT_LIMITS.noteMin} and ${SUPPORT_LIMITS.noteMax} characters`;
  if (UNSAFE.test(t)) return "Remove special characters like < >";
  return undefined;
}

/** A refund amount as typed ("120.50"); the problem or the number. `max` = the order total when known. */
export function refundError(raw: string, max: number | null): string | undefined {
  const t = raw.trim().replace(/[₹,\s]/g, "");
  if (!t) return "Enter the amount refunded";
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(t)) return "An amount like 120.50";
  const n = Number(t);
  if (n < 1) return "At least ₹1";
  if (max !== null && n > max) return `At most the order total (₹${max})`;
  return undefined;
}
export const refundValue = (raw: string) => Number(raw.trim().replace(/[₹,\s]/g, ""));

export function photoError(file: { type: string; size: number }): string | undefined {
  if (!PHOTO_TYPES.includes(file.type)) return "Choose a JPEG or PNG photo";
  if (file.size > SUPPORT_LIMITS.photoBytes) return "Each photo must be at most 2 MB";
  return undefined;
}

/** Units the shopper actually got of an item: what the store sent, else what was ordered. */
export const receivedOf = (item: { quantity: number; quantityFulfilled: number | null }) => item.quantityFulfilled ?? item.quantity;
