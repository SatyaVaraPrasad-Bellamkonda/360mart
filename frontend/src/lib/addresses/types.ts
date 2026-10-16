// JSON shapes and fixed values of the Spring Boot address API (/api/v1/addresses).
// Types and constants only, so client components may import them too.

export const MAX_ADDRESSES = 10;

export const ADDRESS_TYPES = ["HOME", "WORK", "OTHER"] as const;
export type AddressType = (typeof ADDRESS_TYPES)[number];

export const ADDRESS_TYPE_LABEL: Record<AddressType, string> = { HOME: "Home", WORK: "Work", OTHER: "Other" };

// The only values the backend accepts (IndianStates.java), spelled exactly as it returns them.
export const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
] as const;

export const UNION_TERRITORIES = [
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
] as const;

export type IndianState = (typeof STATES)[number] | (typeof UNION_TERRITORIES)[number];
export const INDIAN_STATES: readonly IndianState[] = [...STATES, ...UNION_TERRITORIES];

// A map pin must stay inside this box (same limits as the backend).
export const INDIA_BOUNDS = { minLat: 6.0, maxLat: 37.6, minLng: 68.0, maxLng: 97.5 } as const;

export type Coordinates = { latitude: number; longitude: number };

// GET /addresses (default first, then newest), GET/POST/PUT /addresses/{addressId}
export type Address = {
  addressId: string;
  recipientName: string;
  alternatePhone: string | null; // "+919876543210"
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  city: string;
  state: IndianState;
  country: "India";
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  addressType: AddressType;
  deliveryInstruction: string | null;
  isDefault: boolean;
  createdAt: string;
  modifiedAt: string;
};

// Body of POST and PUT. PUT replaces every field, so always send all of them
// (an omitted optional field is cleared). isDefault omitted = keep as is.
export type AddressInput = {
  recipientName: string;
  alternatePhone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  country: "India";
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  addressType: AddressType;
  deliveryInstruction: string | null;
  isDefault?: boolean;
};

/** The form's values: every text field as typed, the pin as coordinates. */
export type AddressDraft = {
  recipientName: string;
  alternatePhone: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  addressType: AddressType;
  deliveryInstruction: string;
  pin: Coordinates | null;
  isDefault: boolean;
};

export type AddressErrors = Partial<Record<keyof AddressDraft, string>>;
