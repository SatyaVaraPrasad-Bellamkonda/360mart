// The admin's badge label ("New", "Best Seller") as a small pill, the same
// everywhere it appears (home cards, header, tiles). Text stays ≥ 11px.
const TONE = {
  solid: "bg-brand text-ink",
  light: "bg-brand-soft text-brand-deep ring-1 ring-brand/30",
  onPhoto: "bg-white/95 text-brand-deep shadow-sm",
} as const;

export function CategoryBadge({ label, tone = "light", className = "" }: { label: string; tone?: keyof typeof TONE; className?: string }) {
  return (
    <span className={`inline-block max-w-full truncate rounded-full align-middle px-2 py-0.5 text-[11px] font-bold uppercase leading-4 tracking-wide ${TONE[tone]} ${className}`}>
      {label}
    </span>
  );
}
