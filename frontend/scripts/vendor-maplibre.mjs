// Copies the MapLibre map library into public/vendor/maplibre-gl/<version>/ so
// the address form can load it from our own site only when a map is opened.
// MapLibre 6 starts a Web Worker from a file next to its own script; served
// as-is (not bundled), that file is found and the shared code downloads once.
// Runs before `npm run dev` and `npm run build` (predev / prebuild); the
// output is gitignored.
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules/maplibre-gl/dist");
const { version } = JSON.parse(readFileSync(join(root, "node_modules/maplibre-gl/package.json"), "utf8"));
const vendor = join(root, "public/vendor/maplibre-gl");
const target = join(vendor, version);

// Drop older versions so stale copies are never served.
mkdirSync(vendor, { recursive: true });
for (const entry of readdirSync(vendor)) if (entry !== version) rmSync(join(vendor, entry), { recursive: true, force: true });

mkdirSync(target, { recursive: true });
for (const file of ["maplibre-gl.mjs", "maplibre-gl-shared.mjs", "maplibre-gl-worker.mjs", "LICENSE.txt"]) {
  const from = file === "LICENSE.txt" ? join(source, "..", file) : join(source, file);
  try {
    copyFileSync(from, join(target, file));
  } catch (error) {
    if (file !== "LICENSE.txt") throw error;
  }
}
console.log(`maplibre-gl ${version} → public/vendor/maplibre-gl/${version}/`);
