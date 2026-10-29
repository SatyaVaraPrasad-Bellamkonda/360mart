import { Inbox, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminLoadFailed, AdminPageHeader } from "@/components/admin/AdminShell";
import { Pager } from "@/components/inventory/SellerHeader";
import { EmptyOrders, OrderRow } from "@/components/orders/OrderParts";
import { requireRole } from "@/lib/auth/dal";
import { pageFromParam } from "@/lib/inventory/data";
import { isUuidLike } from "@/lib/inventory/validation";
import { loadAdminOrders } from "@/lib/orders/data";
import type { OrderStatus } from "@/lib/orders/types";

export const metadata: Metadata = { title: "Orders", robots: { index: false, follow: false } };

// ?status= is a named group (one chip = one backend call with repeated statuses).
const GROUPS = {
  all: { label: "All", statuses: undefined },
  new: { label: "New", statuses: ["PLACED"] },
  active: { label: "In progress", statuses: ["ACCEPTED", "PACKED", "OUT_FOR_DELIVERY"] },
  delivered: { label: "Delivered", statuses: ["DELIVERED"] },
  cancelled: { label: "Cancelled / declined", statuses: ["CANCELLED", "REJECTED"] },
  undelivered: { label: "Not delivered", statuses: ["UNDELIVERED"] },
} as const satisfies Record<string, { label: string; statuses: OrderStatus[] | undefined }>;
type Group = keyof typeof GROUPS;
const isGroup = (v: unknown): v is Group => typeof v === "string" && v in GROUPS;

function href(p: { group: Group; storeId?: string; page?: number }) {
  const q = new URLSearchParams();
  if (p.group !== "all") q.set("status", p.group);
  if (p.storeId) q.set("storeId", p.storeId);
  if (p.page) q.set("page", String(p.page + 1));
  const s = q.toString();
  return s ? `/admin/orders?${s}` : "/admin/orders";
}

// /admin/orders?status=active&storeId=…&page=2: every store's orders, newest first. One call.
export default function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <>
      <AdminPageHeader title="Orders" subtitle="Every order across stores. Open one to see its items, timeline and to cancel it when needed." />
      <Suspense fallback={<ListSkeleton />}>
        <OrderList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function OrderList({ searchParams }: Pick<PageProps<"/admin/orders">, "searchParams">) {
  await requireRole("admin");
  const sp = await searchParams;
  const group: Group = isGroup(sp.status) ? sp.status : "all";
  const storeId = typeof sp.storeId === "string" && isUuidLike(sp.storeId) ? sp.storeId : undefined;
  const page = pageFromParam(sp.page);
  const res = await loadAdminOrders({ status: GROUPS[group].statuses ? [...GROUPS[group].statuses] : undefined, storeId, page }, href({ group, storeId, page }));
  const storeName = res.ok ? res.data.items[0]?.storeName : undefined;

  return (
    <div className="space-y-4">
      <nav aria-label="Order status" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <ul className="flex w-max gap-2">
          {(Object.keys(GROUPS) as Group[]).map((g) => {
            const current = g === group;
            return (
              <li key={g}>
                <Link
                  href={href({ group: g, storeId })}
                  aria-current={current ? "page" : undefined}
                  className={`flex min-h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition ${current ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line hover:ring-ink"}`}
                >
                  {GROUPS[g].label}
                  {current && res.ok && <span className="ml-2 rounded-full bg-white/20 px-1.5 text-xs">{res.data.totalItems}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {storeId && (
        <Link href={href({ group })} className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-full bg-violet-100 px-4 text-sm font-semibold text-violet-800 transition hover:bg-violet-200">
          <span className="truncate">Store: {storeName ?? "this store"}</span>
          <X aria-hidden className="size-4 shrink-0" />
          <span className="sr-only">Show all stores</span>
        </Link>
      )}

      {!res.ok ? (
        <AdminLoadFailed message={res.error.code === "STORE_NOT_FOUND" ? "There's no store with this link. Remove the store filter to see every order." : res.error.message} />
      ) : res.data.items.length === 0 ? (
        <EmptyOrders icon={Inbox} title="No orders here" text={group === "all" ? "Orders appear here as soon as customers place them." : "No orders match this filter right now."} />
      ) : (
        <>
          <ul className="space-y-2">
            {res.data.items.map((o) => (
              <li key={o.orderId}>
                <OrderRow order={o} href={`/admin/orders/${o.orderId}`} who="both" />
              </li>
            ))}
          </ul>
          <Pager page={res.data.page} totalPages={res.data.totalPages} href={(p) => href({ group, storeId, page: p })} />
        </>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="h-10 w-96 max-w-full animate-pulse rounded-full bg-line/60" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-line/60" />
      ))}
    </div>
  );
}
