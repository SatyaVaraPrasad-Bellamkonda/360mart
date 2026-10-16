import { normalizeMobile } from "@/lib/auth/validation";
import {
  ADDRESS_TYPES,
  INDIA_BOUNDS,
  INDIAN_STATES,
  type Address,
  type AddressDraft,
  type AddressErrors,
  type AddressInput,
  type AddressType,
  type Coordinates,
} from "./types";

// Address rules, used by the form (instant feedback) and the server actions
// (never trust the browser). They mirror AddressRequest.java in the Spring Boot
// API, with the same messages; the backend checks everything again.

const PERSON_NAME = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;
const PLACE_NAME = /^[\p{L}\p{M}][\p{L}\p{M}\p{N} .'-]*$/u;
// No < > (so text can never carry HTML) and no control characters; line breaks
// are allowed only in the delivery instructions.
const SAFE_LINE = /^[^\x00-\x1F\x7F<>]*$/;
const SAFE_MULTILINE = /^[^\x00-\x09\x0B-\x1F\x7F<>]*$/;
const PINCODE = /^[1-9][0-9]{5}$/;

export const ADDRESS_LIMITS = {
  recipientName: 100,
  addressLine1: 200,
  addressLine2: 200,
  landmark: 150,
  city: 100,
  deliveryInstruction: 500,
} as const;

/** Trim and collapse runs of spaces, like the backend does before saving. */
export function collapse(value: string): string {
  return value.trim().replace(/ {2,}/g, " ");
}

/** Round to 6 decimals (about 10 cm), the most the backend accepts. */
export const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export function insideIndia({ latitude, longitude }: Coordinates): boolean {
  return (
    Number.isFinite(latitude) && Number.isFinite(longitude) &&
    latitude >= INDIA_BOUNDS.minLat && latitude <= INDIA_BOUNDS.maxLat &&
    longitude >= INDIA_BOUNDS.minLng && longitude <= INDIA_BOUNDS.maxLng
  );
}

export function isIndianState(value: string): boolean {
  return (INDIAN_STATES as readonly string[]).includes(value);
}

export function addressErrors(draft: AddressDraft): AddressErrors {
  const errors: AddressErrors = {};
  const text = (key: keyof typeof ADDRESS_LIMITS) => collapse(draft[key]);

  const name = text("recipientName");
  if (!name) errors.recipientName = "Recipient name is required";
  else if (name.length > ADDRESS_LIMITS.recipientName) errors.recipientName = "Recipient name must be at most 100 characters";
  else if (!PERSON_NAME.test(name)) errors.recipientName = "Recipient name can contain only letters, spaces, . ' and -";

  if (draft.alternatePhone.trim() && !normalizeMobile(draft.alternatePhone)) {
    errors.alternatePhone = "Enter a valid 10-digit Indian mobile number";
  }

  const line1 = text("addressLine1");
  if (!line1) errors.addressLine1 = "Address line 1 is required";
  else if (line1.length > ADDRESS_LIMITS.addressLine1) errors.addressLine1 = "Address line 1 must be at most 200 characters";
  else if (!SAFE_LINE.test(line1)) errors.addressLine1 = "Address line 1 contains characters that are not allowed";

  const line2 = text("addressLine2");
  if (line2.length > ADDRESS_LIMITS.addressLine2) errors.addressLine2 = "Address line 2 must be at most 200 characters";
  else if (!SAFE_LINE.test(line2)) errors.addressLine2 = "Address line 2 contains characters that are not allowed";

  const landmark = text("landmark");
  if (landmark.length > ADDRESS_LIMITS.landmark) errors.landmark = "Landmark must be at most 150 characters";
  else if (!SAFE_LINE.test(landmark)) errors.landmark = "Landmark contains characters that are not allowed";

  const city = text("city");
  if (!city) errors.city = "City is required";
  else if (city.length > ADDRESS_LIMITS.city) errors.city = "City must be at most 100 characters";
  else if (!PLACE_NAME.test(city)) errors.city = "Enter a valid city name";

  if (!draft.state) errors.state = "State is required";
  else if (!isIndianState(draft.state)) errors.state = "Choose a valid Indian state or union territory";

  const pincode = draft.pincode.trim();
  if (!pincode) errors.pincode = "Pincode is required";
  else if (!PINCODE.test(pincode)) errors.pincode = "Enter a valid 6-digit pincode";

  const note = draft.deliveryInstruction.trim();
  if (note.length > ADDRESS_LIMITS.deliveryInstruction) errors.deliveryInstruction = "Delivery instructions must be at most 500 characters";
  else if (!SAFE_MULTILINE.test(note)) errors.deliveryInstruction = "Delivery instructions contain characters that are not allowed";

  if (draft.pin && !insideIndia(draft.pin)) errors.pin = "The pin must be inside India";

  return errors;
}

/** The request body for a checked draft. Every field is sent: PUT clears what's left out. */
export function toAddressInput(draft: AddressDraft, isDefault: boolean | undefined): AddressInput {
  const optional = (value: string) => collapse(value) || null;
  const phone = normalizeMobile(draft.alternatePhone);
  return {
    recipientName: collapse(draft.recipientName),
    alternatePhone: phone ? `+91${phone}` : null,
    addressLine1: collapse(draft.addressLine1),
    addressLine2: optional(draft.addressLine2),
    landmark: optional(draft.landmark),
    city: collapse(draft.city),
    state: draft.state,
    country: "India",
    pincode: draft.pincode.trim(),
    latitude: draft.pin ? round6(draft.pin.latitude) : null,
    longitude: draft.pin ? round6(draft.pin.longitude) : null,
    addressType: draft.addressType,
    deliveryInstruction: draft.deliveryInstruction.trim() || null,
    ...(isDefault === undefined ? {} : { isDefault }),
  };
}

/** A saved address back into form values (for editing, or "make default", which must resend everything). */
export function toDraft(address: Address): AddressDraft {
  return {
    recipientName: address.recipientName,
    alternatePhone: address.alternatePhone?.replace(/^\+91/, "") ?? "",
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 ?? "",
    landmark: address.landmark ?? "",
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    addressType: address.addressType,
    deliveryInstruction: address.deliveryInstruction ?? "",
    pin: address.latitude != null && address.longitude != null ? { latitude: address.latitude, longitude: address.longitude } : null,
    isDefault: address.isDefault,
  };
}

export function emptyDraft(recipientName = ""): AddressDraft {
  return {
    recipientName,
    alternatePhone: "",
    addressLine1: "",
    addressLine2: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
    addressType: "HOME",
    deliveryInstruction: "",
    pin: null,
    isDefault: false,
  };
}

/** Rebuilds a draft from untrusted action input (anything from the browser can be forged). */
export function readDraft(input: unknown): AddressDraft | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const str = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string) : "");
  const pin = raw.pin as Record<string, unknown> | null | undefined;
  const lat = pin && typeof pin === "object" ? pin.latitude : undefined;
  const lng = pin && typeof pin === "object" ? pin.longitude : undefined;
  const type = ADDRESS_TYPES.includes(raw.addressType as AddressType) ? (raw.addressType as AddressType) : "HOME";
  return {
    recipientName: str("recipientName"),
    alternatePhone: str("alternatePhone"),
    addressLine1: str("addressLine1"),
    addressLine2: str("addressLine2"),
    landmark: str("landmark"),
    city: str("city"),
    state: str("state"),
    pincode: str("pincode"),
    addressType: type,
    deliveryInstruction: str("deliveryInstruction"),
    pin: typeof lat === "number" && typeof lng === "number" ? { latitude: lat, longitude: lng } : null,
    isDefault: raw.isDefault === true,
  };
}

/** Backend field names → form field names (the pin is one field in the form). */
export function draftFieldErrors(fieldErrors: Record<string, string>): AddressErrors {
  const errors: AddressErrors = {};
  for (const [field, message] of Object.entries(fieldErrors)) {
    const key = field === "latitude" || field === "longitude" || field === "coordinatesComplete" ? "pin" : field;
    if (key in emptyDraft()) errors[key as keyof AddressDraft] ??= message;
  }
  return errors;
}
