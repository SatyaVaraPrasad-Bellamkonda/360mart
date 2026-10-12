// JSON shapes of the Spring Boot auth API (/api/v1/auth/*, /api/v1/users/me).
// Types only, so client components may import them too.

export type OtpPurpose = "SIGNUP" | "PASSWORD_RESET";

export type OtpInfo = {
  otpId: string;
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

export type ApiRole = "CUSTOMER" | "STORE_OWNER" | "ADMIN";

export type UserResponse = {
  userId: string;
  fullName: string | null;
  mobileNumber: string;
  email: string | null;
  role: ApiRole;
  mobileVerified: boolean;
  lastLoginAt: string | null;
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
