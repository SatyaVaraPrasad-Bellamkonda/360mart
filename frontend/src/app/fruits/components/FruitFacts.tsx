import { CalendarDays, MapPin, Snowflake } from "lucide-react";
import type { Product } from "@/lib/types";

export function FruitFacts({ product }: { product: Pick<Product, "origin" | "bestSeason" | "storageTip"> }) {
  const facts = [
    { label: "Origin", value: product.origin, icon: MapPin },
    { label: "Best season", value: product.bestSeason, icon: CalendarDays },
    { label: "How to store", value: product.storageTip, icon: Snowflake },
  ];

  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      {facts.map(({ label, value, icon: Icon }) => (
        <div key={label} className="flex gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-fresh ring-1 ring-line">
            <Icon aria-hidden className="size-5" />
          </span>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
            <dd className="mt-0.5 text-sm text-ink">{value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
