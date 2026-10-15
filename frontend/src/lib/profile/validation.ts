// Profile rules, used by the form (instant feedback) and the server actions
// (never trust the browser). They mirror UpdateUserRequest and
// ProfileImageProcessor in the Spring Boot API, with the same messages.

// Letters from any script (Telugu, Hindi… including their vowel marks), then
// letters, spaces, . ' - (same as the backend's NAME pattern).
const NAME = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PROFILE_IMAGE_TYPES = ["image/jpeg", "image/png"];
export const PROFILE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export type ProfileInput = { firstName: string; lastName: string; email: string };
export type ProfileErrors = Partial<Record<keyof ProfileInput, string>>;

export function profileErrors({ firstName, lastName, email }: ProfileInput): ProfileErrors {
  const errors: ProfileErrors = {};
  const first = firstName.trim();
  const last = lastName.trim();
  const mail = email.trim();

  if (!first) errors.firstName = "First name is required";
  else if (first.length > 100) errors.firstName = "First name must be at most 100 characters";
  else if (!NAME.test(first)) errors.firstName = "First name can contain only letters, spaces, . ' and -";

  if (last.length > 100) errors.lastName = "Last name must be at most 100 characters";
  else if (last && !NAME.test(last)) errors.lastName = "Last name can contain only letters, spaces, . ' and -";

  if (mail.length > 255) errors.email = "Email must be at most 255 characters";
  else if (mail && !EMAIL.test(mail)) errors.email = "Enter a valid email address";

  return errors;
}

/** Checked before uploading, so a wrong file fails instantly instead of after a slow upload. */
export function profileImageError(file: { type: string; size: number } | null | undefined): string | undefined {
  if (!file || file.size === 0) return "Choose a photo to upload.";
  if (!PROFILE_IMAGE_TYPES.includes(file.type)) return "Use a JPEG or PNG image.";
  if (file.size > PROFILE_IMAGE_MAX_BYTES) return "The image must be at most 2 MB.";
  return undefined;
}
