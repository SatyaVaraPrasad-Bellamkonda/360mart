export function CategoryFormSkeleton() {
  return (
    <div aria-hidden className="space-y-5">
      <div className="h-80 animate-pulse rounded-3xl bg-line/60" />
      <div className="h-44 animate-pulse rounded-3xl bg-line/60" />
      <div className="h-64 animate-pulse rounded-3xl bg-line/60" />
    </div>
  );
}
