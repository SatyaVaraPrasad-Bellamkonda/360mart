import { ArrowLeft } from "lucide-react";
import Link from "next/link";

// Back link + title shared by the address pages (same style as /account/profile).
export function AddressPageHeader({ back, backLabel, title, subtitle }: { back: string; backLabel: string; title: string; subtitle: string }) {
  return (
    <div>
      <Link href={back} className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft aria-hidden className="size-4" />
        {backLabel}
      </Link>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
      <p className="mt-1 text-muted">{subtitle}</p>
    </div>
  );
}

export function LoadFailed({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-3xl border border-line bg-white px-5 py-6 text-sm text-red-700">
      {message}
    </p>
  );
}

export function FormSkeleton() {
  return (
    <div aria-hidden className="space-y-5">
      <div className="h-40 animate-pulse rounded-3xl bg-line/60" />
      <div className="h-96 animate-pulse rounded-3xl bg-line/60" />
      <div className="h-64 animate-pulse rounded-3xl bg-line/60" />
    </div>
  );
}
