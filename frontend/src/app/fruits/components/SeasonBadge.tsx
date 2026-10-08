export function SeasonBadge({ inSeason }: { inSeason: boolean }) {
  return inSeason ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-fresh-soft px-2.5 py-0.5 text-xs font-semibold text-fresh">
      🌱 In season
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-muted">
      Off season
    </span>
  );
}
