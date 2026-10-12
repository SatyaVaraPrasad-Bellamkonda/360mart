import "server-only";

let warned = false;

// Base URL of the Spring Boot API, from the API_URL environment variable:
//   local:      http://localhost:8080/api/v1   (.env.local)
//   production: https://api.360mart.in/api/v1  (Vercel → Settings → Environment Variables)
// It has no NEXT_PUBLIC_ prefix, so it is read on the server at request time and
// never shipped to the browser. One build can point at any backend.
export function apiBaseUrl(): string | null {
  const raw = process.env.API_URL?.trim();
  if (!raw) return misconfigured("API_URL is not set. Add it to .env.local (see .env.example).");

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return misconfigured(`API_URL "${raw}" is not a valid URL.`);
  }

  // Passwords and session tokens travel on this connection, so outside the
  // local machine or a private Docker network it must be HTTPS.
  const internalHost = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || !url.hostname.includes(".");
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:" && !internalHost) {
    return misconfigured("API_URL must use https:// in production.");
  }

  return raw.replace(/\/+$/, "");
}

function misconfigured(message: string): null {
  if (!warned) {
    console.error(`[api] ${message}`);
    warned = true;
  }
  return null;
}
