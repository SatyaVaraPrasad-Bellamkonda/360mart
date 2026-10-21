import { CalendarClock, EyeOff } from "lucide-react";
import { CategoryImage } from "@/components/catalog/CategoryImage";
import type { Listing } from "@/lib/inventory/types";
import { discountPercent, money, stockState } from "@/lib/inventory/validation";

// Display pieces shared by the seller's product screens: thumbnail, price with
// MRP and discount, stock status and badges.

export function ProductThumb({ src, name, className = "size-14 rounded-2xl" }: { src: string | null; name: string; className?: string }) {
  return <CategoryImage key={src ?? "none"} src={src} alt={name} className={`shrink-0 overflow-hidden bg-surface object-cover ring-1 ring-line ${className}`} iconClassName="size-1/2" />;
}

/** "₹329  ₹399  18% off" (MRP crossed out only when there's a discount). */
export function PriceBlock({ price, mrp, size = "md" }: { price: number; mrp: number; size?: "md" | "lg" }) {
  const off = discountPercent(price, mrp);
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className={`font-extrabold tracking-tight text-ink ${size === "lg" ? "text-3xl" : "text-base"}`}>{money(price)}</span>
      {off > 0 && (
        <>
          <span className={`text-muted line-through ${size === "lg" ? "text-base" : "text-xs"}`}>
            <span className="sr-only">MRP </span>
            {money(mrp)}
          </span>
          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-bold text-green-700 ring-1 ring-green-200">{off}% off</span>
        </>
      )}
    </span>
  );
}

const STOCK_TONE = {
  out: "bg-red-50 text-red-700 ring-red-200",
  low: "bg-amber-50 text-amber-800 ring-amber-200",
  ok: "bg-slate-50 text-ink ring-line",
} as const;

export function StockPill({ listing }: { listing: Pick<Listing, "stockQuantity" | "isLowStock"> }) {
  const state = stockState(listing);
  const text = state === "out" ? "Out of stock" : state === "low" ? `Low: ${listing.stockQuantity} left` : `${listing.stockQuantity.toLocaleString("en-IN")} in stock`;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${STOCK_TONE[state]}`}>
      <span aria-hidden className={`size-1.5 rounded-full ${state === "out" ? "bg-red-500" : state === "low" ? "bg-amber-500" : "bg-green-500"}`} />
      {text}
    </span>
  );
}

export function ListingBadges({ listing }: { listing: Pick<Listing, "isAvailable" | "tracksBatches"> }) {
  if (listing.isAvailable && !listing.tracksBatches) return null;
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {!listing.isAvailable && (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
          <EyeOff aria-hidden className="size-3" />
          Hidden
        </span>
      )}
      {listing.tracksBatches && (
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-200">
          <CalendarClock aria-hidden className="size-3" />
          Expiry tracked
        </span>
      )}
    </span>
  );
}
