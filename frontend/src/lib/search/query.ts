// Search text rules shared by the header box, the results page and the actions
// (the backend trims, lower-cases, needs 2+ characters and cuts at 100).
// Safe for client components.

export const MIN_QUERY = 2;
export const MAX_QUERY = 100;
export const SUGGEST_SIZE = 5;
export const RESULTS_SIZE = 24;

/** The text to send, or null when it's too short to search. */
export function cleanQuery(q: unknown): string | null {
  if (typeof q !== "string") return null;
  const text = q.trim().replace(/\s+/g, " ").slice(0, MAX_QUERY);
  return text.length >= MIN_QUERY ? text : null;
}

export const searchHref = (q: string) => `/search?q=${encodeURIComponent(q.trim())}`;
