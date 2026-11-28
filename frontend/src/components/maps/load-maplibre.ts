import type * as MapLibre from "maplibre-gl";

// MapLibre (~600 KB) isn't part of our JavaScript bundle: it is loaded as-is
// from /vendor/ (copied there by scripts/vendor-maplibre.mjs) the first time a
// map opens, so pages stay light on phones. One shared promise for every map.

let library: Promise<typeof MapLibre> | null = null;

export function loadMapLibre(url: string): Promise<typeof MapLibre> {
  library ??= import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url).catch((error) => {
    library = null; // let a later attempt retry
    throw error;
  });
  return library;
}
