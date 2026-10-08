export function FormSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="h-20 animate-pulse rounded-xl bg-surface" />
      <div className="h-12 animate-pulse rounded-full bg-surface" />
    </div>
  );
}
