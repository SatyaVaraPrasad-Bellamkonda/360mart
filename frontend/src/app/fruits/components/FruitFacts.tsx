import type { Product } from "@/lib/types";

export function FruitFacts({ product }: { product: Pick<Product, "origin" | "bestSeason" | "storageTip"> }) {
  const facts = [
    { label: "Origin", value: product.origin, icon: "📍" },
    { label: "Best season", value: product.bestSeason, icon: "📅" },
    { label: "How to store", value: product.storageTip, icon: "🧊" },
  ];

  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      {facts.map((fact) => (
        <div key={fact.label} className="rounded-2xl bg-surface p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
            <span aria-hidden>{fact.icon}</span> {fact.label}
          </dt>
          <dd className="mt-1 text-sm text-ink">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
