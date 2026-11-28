// Small display helpers for delivery screens (client and server safe).

export { money } from "@/lib/inventory/validation";

/** "just now" / "3 min ago" / "2 h ago" / "3 days ago", from the browser's clock. */
export function ago(iso: string, now: number): string {
  const ms = now - Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return `${d} ${d === 1 ? "day" : "days"} ago`;
}

/** 0.35 → "350 m", 2.4 → "2.4 km" (0.0 → "under 100 m"). */
export function distanceText(km: number): string {
  if (km < 0.1) return "under 100 m";
  if (km < 1) return `${Math.round(km * 1000 / 10) * 10} m`;
  return `${km.toFixed(1)} km`;
}
