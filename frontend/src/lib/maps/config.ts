import "server-only";
import { version as mapLibreVersion } from "maplibre-gl/package.json";

// Map settings, read on the server at request time (so they can change per
// deployment without a rebuild) and handed to the address form as props.

export type MapConfig = {
  /** MapLibre style JSON: which tiles the map shows. */
  styleUrl: string;
  /** The MapLibre library itself, served from our own site (see scripts/vendor-maplibre.mjs). */
  libraryUrl: string;
  /** Whether place search and filling the address from the pin are on (GEOCODER_URL is set). */
  canSuggest: boolean;
};

const DEFAULT_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export function mapConfig(): MapConfig {
  return {
    styleUrl: process.env.MAP_STYLE_URL?.trim() || DEFAULT_STYLE,
    libraryUrl: `/vendor/maplibre-gl/${mapLibreVersion}/maplibre-gl.mjs`,
    canSuggest: !!geocoderUrl(),
  };
}

/** Base URL of a Nominatim-compatible server (".../reverse" is appended), or null when unset. */
export function geocoderUrl(): string | null {
  const raw = process.env.GEOCODER_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.hostname === "localhost" ? raw.replace(/\/+$/, "") : null;
  } catch {
    return null;
  }
}
