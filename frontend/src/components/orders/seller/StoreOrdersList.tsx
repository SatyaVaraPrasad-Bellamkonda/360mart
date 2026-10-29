"use client";

import { CheckCheck, Inbox, Timer, Truck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmptyOrders, OrderRow } from "@/components/orders/OrderParts";
import { toastSuccess } from "@/components/Toaster";
import type { StoreTab } from "@/lib/orders/data";
import { countdown } from "@/lib/orders/format";
import { loadStoreOrdersAction } from "@/lib/orders/store-actions";
import type { OrderSummary, Page } from "@/lib/orders/types";
import { useNow } from "./useNow";

const POLL_MS = 30_000;

const EMPTY: Record<StoreTab, { title: string; text: string; icon: typeof Inbox }> = {
  new: { title: "No new orders", text: "New orders show up here by themselves, so you can keep this page open.", icon: Inbox },
  active: { title: "Nothing in progress", text: "Orders you've accepted stay here until they're delivered.", icon: Truck },
  done: { title: "No finished orders yet", text: "Delivered, cancelled and declined orders are kept here.", icon: CheckCheck },
};

// The store's order list. Starts from the server's copy, then asks again every
// 30 s while the tab is visible, so new orders arrive without a reload. New
// orders get a live "answer within" countdown (one shared clock for every row).
export function StoreOrdersList({ tab, initial, pageHrefs }: { tab: StoreTab; initial: Page<OrderSummary>; pageHrefs: { prev: string | null; next: string | null } }) {
  const { sessionExpired } = useAuth();
  const [data, setData] = useState(initial);
  const lastTotal = useRef(initial.totalItems);

  useEffect(() => {
    let live = true;
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      const res = await loadStoreOrdersAction(tab, initial.page);
      if (!live) return;
      if (!res.ok) {
        if (res.error.code === "UNAUTHENTICATED") sessionExpired();
        return;
      }
      if (tab === "new" && res.data.totalItems > lastTotal.current) {
        const added = res.data.totalItems - lastTotal.current;
        toastSuccess(added === 1 ? "New order" : `${added} new orders`);
      }
      lastTotal.current = res.data.totalItems;
      setData(res.data);
    };
    const timer = setInterval(refresh, POLL_MS);
    // Coming back to the tab: catch up at once instead of waiting for the next tick.
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      live = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [tab, initial.page, sessionExpired]);

  if (data.items.length === 0) {
    const e = EMPTY[tab];
    return <EmptyOrders icon={e.icon} title={e.title} text={e.text} />;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted" aria-live="polite">
        {data.totalItems} {data.totalItems === 1 ? "order" : "orders"}
        {tab === "new" && " waiting for you"} · refreshes by itself
      </p>
      <ul className="space-y-2">
        {data.items.map((o, i) => (
          <li key={o.orderId} style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }} className="motion-safe:animate-fade-up">
            <OrderRow order={o} href={`/seller/orders/${o.orderId}`} who="customer" extra={tab === "new" && o.status === "PLACED" ? <AnswerWithin acceptBy={o.acceptBy} /> : undefined} />
          </li>
        ))}
      </ul>
      {(pageHrefs.prev || pageHrefs.next) && (
        <nav aria-label="Pages" className="flex items-center justify-between gap-3 pt-2">
          {pageHrefs.prev ? (
            <Link href={pageHrefs.prev} className="flex min-h-10 items-center rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-ink">
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted">
            Page {data.page + 1} of {Math.max(1, data.totalPages)}
          </span>
          {pageHrefs.next ? (
            <Link href={pageHrefs.next} className="flex min-h-10 items-center rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-ink">
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

function AnswerWithin({ acceptBy }: { acceptBy: string | null }) {
  const now = useNow();
  if (!acceptBy || now === null) return null;
  const left = countdown(acceptBy, now);
  const urgent = left !== null && Date.parse(acceptBy) - now < 2 * 60_000;
  return (
    <span className={`mt-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums ${!left ? "bg-red-50 text-red-700" : urgent ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>
      <Timer aria-hidden className="size-3.5" />
      {left ? `Answer within ${left}` : "Time's up"}
    </span>
  );
}
