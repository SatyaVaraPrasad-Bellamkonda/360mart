import { Check, CircleDot, Clock3, PackageCheck, ShoppingBag, Store, Truck, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { FoodMark } from "@/components/catalog/FoodMark";
import { ProductThumb } from "@/components/inventory/ListingParts";
import { ACTOR, ACTOR_NEUTRAL, fulfilment, money, progressSteps, STATUS, when } from "@/lib/orders/format";
import type { OrderItem, OrderStatus, OrderSummary, TimelineEntry } from "@/lib/orders/types";

// Display pieces shared by the shopper's, the store's and the admin's order
// screens: status pill, progress tracker, items, totals, timeline, list row.

export function StatusPill({ status, className = "" }: { status: OrderStatus; className?: string }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${s?.tone ?? "bg-surface text-muted"} ${className}`}>
      <span aria-hidden className={`size-1.5 rounded-full ${s?.dot ?? "bg-muted"}`} />
      {s?.label ?? status}
    </span>
  );
}

const STEP_ICON: Record<string, LucideIcon> = { PLACED: ShoppingBag, ACCEPTED: Store, PACKED: PackageCheck, OUT_FOR_DELIVERY: Truck, DELIVERED: Check };

/** Placed → Accepted → (Packed) → On the way → Delivered, with times. Horizontal on wide screens, vertical on phones. */
export function ProgressTracker(props: Parameters<typeof progressSteps>[0]) {
  const steps = progressSteps(props);
  return (
    <ol className="grid gap-3 sm:flex sm:gap-0" aria-label="Order progress">
      {steps.map((s, i) => {
        const Icon = STEP_ICON[s.status] ?? CircleDot;
        const last = i === steps.length - 1;
        return (
          <li key={s.status} className="relative flex items-center gap-3 sm:flex-1 sm:flex-col sm:items-center sm:gap-2 sm:text-center" aria-current={s.current ? "step" : undefined}>
            {/* The line to the next step (between the icons). */}
            {!last && <span aria-hidden className={`absolute left-[1.15rem] top-10 h-[calc(100%-1.75rem)] w-0.5 sm:left-[calc(50%+1.5rem)] sm:top-[1.15rem] sm:h-0.5 sm:w-[calc(100%-3rem)] ${steps[i + 1].done ? "bg-fresh" : "bg-line"}`} />}
            <span
              className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full ring-4 ring-white transition ${
                s.current ? "bg-fresh text-white shadow-lg shadow-fresh/30 motion-safe:animate-pop-in" : s.done ? "bg-fresh-soft text-fresh" : "bg-surface text-muted"
              }`}
            >
              <Icon aria-hidden className="size-5" />
            </span>
            <span className="min-w-0">
              <span className={`block text-sm font-semibold ${s.done ? "text-ink" : "text-muted"}`}>{s.label}</span>
              <span className="block text-xs text-muted">{s.at ? when(s.at) : s.done ? "" : "Pending"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** The ordered items with what was actually sent. */
export function OrderItems({ items }: { items: OrderItem[] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => {
        const short = fulfilment(item);
        const none = item.quantityFulfilled === 0;
        return (
          <li key={item.listingId} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <ProductThumb src={item.imageUrl} name={item.productName} className={`size-14 rounded-2xl ${none ? "opacity-50 grayscale" : ""}`} />
            <div className="min-w-0 flex-1">
              <p className="flex items-start gap-1.5">
                <FoodMark type={item.foodType} className="mt-0.5" />
                <span className={`font-semibold leading-snug ${none ? "text-muted line-through" : "text-ink"}`}>{item.productName}</span>
              </p>
              <p className="mt-0.5 text-sm text-muted">
                {item.variantLabel} · {item.quantity} × {money(item.unitPrice)}
                {item.unitMrp > item.unitPrice && <span className="ml-1 line-through">{money(item.unitMrp)}</span>}
              </p>
              {short && <p className={`mt-1 inline-flex rounded-md px-1.5 py-0.5 text-xs font-bold ${none ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>{short}</p>}
            </div>
            <p className={`shrink-0 text-right font-bold ${none ? "text-muted line-through" : "text-ink"}`}>{money(item.lineTotal)}</p>
          </li>
        );
      })}
    </ul>
  );
}

/** Bill summary: items (MRP and savings), delivery, total; numbers exactly as the backend sent them. */
export function OrderTotals({ o, savings, paymentMethod }: { o: { itemsMrpTotal: number; itemsTotal: number; discountTotal: number; deliveryFee: number; grandTotal: number }; savings?: number; paymentMethod?: string }) {
  const saved = savings ?? Math.max(0, o.itemsMrpTotal - o.itemsTotal);
  return (
    <dl className="space-y-2 text-sm">
      <Row label="Items (MRP)" value={money(o.itemsMrpTotal)} muted />
      {o.itemsMrpTotal > o.itemsTotal && <Row label="Item discount" value={`− ${money(o.itemsMrpTotal - o.itemsTotal)}`} tone="text-fresh" />}
      <Row label="Items total" value={money(o.itemsTotal)} />
      {o.discountTotal > 0 && <Row label="Offers" value={`− ${money(o.discountTotal)}`} tone="text-fresh" />}
      <Row label="Delivery fee" value={o.deliveryFee > 0 ? money(o.deliveryFee) : "Free"} tone={o.deliveryFee > 0 ? undefined : "text-fresh"} />
      <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-line pt-3">
        <dt className="font-bold text-ink">
          {paymentMethod === "COD" ? "To pay on delivery" : "Total"}
          <span className="block text-xs font-normal text-muted">Includes GST</span>
        </dt>
        <dd className="text-xl font-extrabold text-ink">{money(o.grandTotal)}</dd>
      </div>
      {saved > 0 && <p className="rounded-xl bg-fresh-soft px-3 py-2 text-center text-sm font-semibold text-fresh">You save {money(saved)} on this order</p>}
    </dl>
  );
}

function Row({ label, value, muted, tone }: { label: string; value: string; muted?: boolean; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={muted ? "text-muted" : "text-ink"}>{label}</dt>
      <dd className={`font-semibold ${tone ?? (muted ? "text-muted" : "text-ink")}`}>{value}</dd>
    </div>
  );
}

/** Every status change with who made it. */
export function Timeline({ entries, audience }: { entries: TimelineEntry[]; audience: "customer" | "store" }) {
  const actors = audience === "customer" ? ACTOR : ACTOR_NEUTRAL;
  const sorted = [...entries].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return (
    <ol className="space-y-4">
      {sorted.map((e, i) => (
        <li key={`${e.status}-${e.at}`} className="flex gap-3">
          <span aria-hidden className={`mt-1.5 size-2.5 shrink-0 rounded-full ${i === 0 ? STATUS[e.status]?.dot ?? "bg-ink" : "bg-line"}`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{STATUS[e.status]?.label ?? e.status}</p>
            <p className="text-xs text-muted">
              {when(e.at)} · by {actors[e.actor] ?? e.actor}
            </p>
            {e.note && <p className="mt-1 break-words text-sm text-muted">&ldquo;{e.note}&rdquo;</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** One order in a list (link to its page). `who` = the store (shopper's list) or the customer (store/admin lists). */
export function OrderRow({ order, href, who, extra }: { order: OrderSummary; href: string; who: "store" | "customer" | "both"; extra?: ReactNode }) {
  const name = who === "store" ? order.storeName : who === "customer" ? order.customerName : `${order.customerName} · ${order.storeName}`;
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-line transition hover:ring-ink/30 sm:gap-4">
      <span className={`hidden size-11 shrink-0 items-center justify-center rounded-2xl sm:flex ${STATUS[order.status]?.tone ?? "bg-surface"}`}>
        {order.status === "DELIVERED" ? <Check aria-hidden className="size-5" /> : order.status === "CANCELLED" || order.status === "REJECTED" ? <X aria-hidden className="size-5" /> : <Clock3 aria-hidden className="size-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate font-semibold text-ink">{name}</span>
          <StatusPill status={order.status} />
        </span>
        <span className="mt-0.5 block text-sm text-muted">
          {order.orderNumber} · {order.itemCount} {order.itemCount === 1 ? "item" : "items"} · {when(order.placedAt)}
        </span>
        {extra}
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-bold text-ink">{money(order.grandTotal)}</span>
        <span className="block text-xs text-muted">{order.paymentMethod === "COD" ? "Cash" : order.paymentMethod}</span>
      </span>
    </Link>
  );
}

/** White card with a heading, used across the order pages. */
export function Panel({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl bg-white p-5 ring-1 ring-line sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-bold text-ink">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** The delivery address block. */
export function AddressBlock({ a }: { a: { name: string; phone: string | null; addressLine1: string; addressLine2: string | null; landmark: string | null; city: string; state: string; pincode: string; deliveryInstruction: string | null } }) {
  return (
    <div className="text-sm">
      <p className="font-semibold text-ink">{a.name}</p>
      <p className="mt-0.5 break-words text-muted">
        {[a.addressLine1, a.addressLine2, a.landmark].filter(Boolean).join(", ")}
        <br />
        {a.city}, {a.state} {a.pincode}
      </p>
      {a.phone && <p className="mt-1 text-muted">{a.phone}</p>}
      {a.deliveryInstruction && <p className="mt-2 rounded-xl bg-surface px-3 py-2 text-muted">&ldquo;{a.deliveryInstruction}&rdquo;</p>}
    </div>
  );
}

/** Empty list / not found states. */
export function EmptyOrders({ icon: Icon = ShoppingBag, title, text, children }: { icon?: LucideIcon; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-12 text-center ring-1 ring-line">
      <span className="flex size-16 items-center justify-center rounded-full bg-brand-soft text-brand-deep">
        <Icon aria-hidden className="size-8" />
      </span>
      <p className="mt-4 text-lg font-bold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>
      {children}
    </div>
  );
}
