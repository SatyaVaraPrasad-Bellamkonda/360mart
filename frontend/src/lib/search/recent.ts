// The shopper's last few searches, on this device only (a convenience: it can
// be empty or unavailable, e.g. in a private window). Safe for client code.

const KEY = "360mart.recentSearches";
const MAX = 6;

export function readRecent(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((t): t is string => typeof t === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function rememberSearch(q: string) {
  const text = q.trim().toLowerCase();
  if (!text) return;
  try {
    localStorage.setItem(KEY, JSON.stringify([text, ...readRecent().filter((t) => t !== text)].slice(0, MAX)));
  } catch {}
}

export function clearRecent() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
