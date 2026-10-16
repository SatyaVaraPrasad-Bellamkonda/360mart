import "server-only";
import { unstable_rethrow } from "next/navigation";
import { INDIAN_STATES, type IndianState } from "@/lib/addresses/types";
import { geocoderUrl } from "./config";

// Turns a map pin into address suggestions (reverse geocoding), and a typed
// place name into map positions (search), with a
// Nominatim-compatible server set in GEOCODER_URL: self-hosted Nominatim in
// production; the public nominatim.openstreetmap.org only for light testing
// (its policy: at most 1 request per second, an identifying User-Agent, no
// heavy use, and no search-as-you-type: we search only on Enter / the button). It runs on our server so the browser never talks to it, and the
// coordinates are never logged (an exact location is personal data).

export type PlaceSuggestion = {
  area: string | null; // street / locality, for address line 2
  city: string | null;
  state: IndianState | null;
  pincode: string | null;
};

/** One search result: where to put the pin, and what to fill in. */
export type PlaceMatch = { label: string; latitude: number; longitude: number; place: PlaceSuggestion };

type Failure = { ok: false; code: string; message: string };
type Result = { ok: true; data: PlaceSuggestion } | Failure;

const USER_AGENT = "360mart.in address form (+https://360mart.in)";
const MIN_GAP_MS = 1100;
const TIMEOUT_MS = 8000;
const UNAVAILABLE = "We couldn't look up locations right now. Please fill in the address yourself.";

// Same alternate names the backend accepts (IndianStates.java), plus Nominatim's own spellings.
const STATE_ALIASES: Record<string, IndianState> = {
  orissa: "Odisha",
  uttaranchal: "Uttarakhand",
  pondicherry: "Puducherry",
  "new delhi": "Delhi",
  "nct of delhi": "Delhi",
  "national capital territory of delhi": "Delhi",
  "andaman & nicobar islands": "Andaman and Nicobar Islands",
  "jammu & kashmir": "Jammu and Kashmir",
  "dadra and nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
  "daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
};

let queue: Promise<unknown> = Promise.resolve();
let lastCall = 0;

export async function reverseGeocode(latitude: number, longitude: number): Promise<Result> {
  const body = await lookup<{ address?: Record<string, unknown> }>("reverse", {
    lat: String(latitude),
    lon: String(longitude),
    zoom: "18",
  });
  if (!body.ok) return body;
  const suggestion = toSuggestion(body.data.address ?? {});
  if (!suggestion.city && !suggestion.state && !suggestion.pincode) {
    return { ok: false, code: "PLACE_NOT_FOUND", message: "We couldn't find an address for this spot. Please fill it in yourself." };
  }
  return { ok: true, data: suggestion };
}

type SearchHit = { lat?: string; lon?: string; display_name?: string; address?: Record<string, unknown> };

/** Places in India matching what the shopper typed (an area, street, landmark or pincode). */
export async function searchPlaces(query: string): Promise<{ ok: true; data: PlaceMatch[] } | Failure> {
  const body = await lookup<SearchHit[]>("search", { q: query, countrycodes: "in", limit: "5" });
  if (!body.ok) return body;
  const matches: PlaceMatch[] = [];
  for (const hit of Array.isArray(body.data) ? body.data : []) {
    const latitude = Math.round(Number(hit.lat) * 1e6) / 1e6;
    const longitude = Math.round(Number(hit.lon) * 1e6) / 1e6;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || typeof hit.display_name !== "string") continue;
    // "Koti, Sultan Bazar, Hyderabad, Telangana, 500095, India" → without the country.
    const label = clean(hit.display_name).replace(/,\s*India$/, "").slice(0, 200);
    matches.push({ label, latitude, longitude, place: toSuggestion(hit.address ?? {}) });
  }
  return { ok: true, data: matches };
}

async function lookup<T>(endpoint: "reverse" | "search", params: Record<string, string>): Promise<{ ok: true; data: T } | Failure> {
  const base = geocoderUrl();
  if (!base) return { ok: false, code: "GEOCODER_UNAVAILABLE", message: UNAVAILABLE };

  // One lookup at a time, at least MIN_GAP_MS apart (per server instance).
  const turn = queue.then(async () => {
    const wait = lastCall + MIN_GAP_MS - performance.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCall = performance.now();
  });
  queue = turn.catch(() => undefined);
  await turn;

  const url = new URL(`${base}/${endpoint}`);
  url.search = new URLSearchParams({ format: "jsonv2", addressdetails: "1", "accept-language": "en", ...params }).toString();

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[geocoder] ${endpoint} → ${res.status}`);
      return { ok: false, code: "GEOCODER_UNAVAILABLE", message: UNAVAILABLE };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch (error) {
    unstable_rethrow(error);
    console.error(`[geocoder] ${endpoint} failed: ${error instanceof Error ? error.message : String(error)}`);
    return { ok: false, code: "GEOCODER_UNAVAILABLE", message: UNAVAILABLE };
  }
}

const clean = (value: string) => value.trim().replace(/[<>\p{Cc}]/gu, "");

function toSuggestion(address: Record<string, unknown>): PlaceSuggestion {
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = address[key];
      if (typeof value === "string" && value.trim()) return clean(value);
    }
    return null;
  };
  const pincode = pick("postcode")?.replace(/\s/g, "") ?? null;
  const area = [pick("road"), pick("neighbourhood", "suburb", "quarter", "hamlet")].filter(Boolean).join(", ");
  return {
    area: area ? area.slice(0, 200) : null,
    city: pick("city", "town", "village", "municipality", "city_district", "county", "state_district")?.slice(0, 100) ?? null,
    state: toState(pick("state")),
    pincode: pincode && /^[1-9][0-9]{5}$/.test(pincode) ? pincode : null,
  };
}

function toState(name: string | null): IndianState | null {
  if (!name) return null;
  const key = name.toLowerCase().replace(/\s+/g, " ");
  return INDIAN_STATES.find((s) => s.toLowerCase() === key) ?? STATE_ALIASES[key] ?? null;
}
