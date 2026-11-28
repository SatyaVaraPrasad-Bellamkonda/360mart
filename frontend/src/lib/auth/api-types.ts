// JSON shapes of the Spring Boot auth API (/api/v1/auth/*, /api/v1/users/me).
// Types only, so client components may import them too.

export type OtpPurpose = "SIGNUP" | "PASSWORD_RESET";

// Every code now goes to the account's verified email ("EMAIL"); "SMS" may come back one day.
export type OtpChannel = "EMAIL" | "SMS";

export type OtpInfo = {
  otpId: string;
  channel?: OtpChannel;
  expiresInSeconds: number;
  resendAfterSeconds: number;
  message: string;
};

export type SignupResponse = {
  userId: string;
  mobileNumber: string; // E.164, e.g. "+919876543210"
  nextStep: "SET_PASSWORD";
  otp: OtpInfo;
  message: string;
};

export type MessageResponse = { message: string };

export type ApiRole = "CUSTOMER" | "STORE_OWNER" | "ADMIN" | "DELIVERY_PARTNER";

// Who signs up (POST /auth/signup). Admins are never created by signup.
// DELIVERY_PARTNER also needs a vehicleType (and optionally vehicleNumber).
export type AccountType = "CUSTOMER" | "STORE_OWNER" | "DELIVERY_PARTNER";

// Returned by login, GET /users/me and PUT /users/{userId}/updateUser.
export type UserResponse = {
  userId: string;
  firstName: string | null; // null until the user fills in their profile
  lastName: string | null;
  mobileNumber: string;
  email: string | null;
  /** Proved with a code: only a verified email receives login / reset / deletion codes. */
  emailVerified?: boolean;
  /** An address waiting for its code (change started, not finished); left out of the JSON when null. */
  pendingEmail?: string | null;
  profileImageUrl: string | null; // signed link, expires after ~1 hour; null = no picture
  role: ApiRole;
  /** False for accounts made since codes go by email (the code proves the email, not the phone): never warn on it. */
  mobileVerified: boolean;
  lastLoginAt: string | null;
};

// PUT / GET /users/{userId}/profile-image
export type ProfileImageResponse = {
  profileImageId: string;
  url: string; // signed link, expires at expiresAt
  expiresAt: string;
};

// Every error response (RFC 9457 problem document + a stable `code`).
export type ApiProblem = {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  code?: string; // absent only for malformed requests
  errors?: { field: string; message: string }[]; // only for VALIDATION_FAILED
};
