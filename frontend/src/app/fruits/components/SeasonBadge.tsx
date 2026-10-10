import { CalendarX2, Leaf } from "lucide-react";

export function SeasonBadge({ inSeason }: { inSeason: boolean }) {
  return inSeason ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-fresh ring-1 ring-green-200">
      <Leaf aria-hidden className="size-3.5" /> In season
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-muted ring-1 ring-line">
      <CalendarX2 aria-hidden className="size-3.5" /> Off season
    </span>
  );
}
