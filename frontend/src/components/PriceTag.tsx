import { discountPercent, formatPrice } from "@/lib/format";

type Props = { price: number | null; mrp: number | null; size?: "sm" | "lg" };

export function PriceTag({ price, mrp, size = "sm" }: Props) {
  if (price === null || mrp === null) {
    return <p className="text-sm font-semibold text-muted">Currently unavailable</p>;
  }

  const off = discountPercent(price, mrp);
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      <span className={`font-extrabold text-ink ${size === "lg" ? "text-3xl" : "text-lg"}`}>{formatPrice(price)}</span>
      {off > 0 && (
        <>
          <s className="text-sm text-muted">{formatPrice(mrp)}</s>
          <span className="text-sm font-semibold text-fresh">{off}% off</span>
        </>
      )}
    </p>
  );
}
