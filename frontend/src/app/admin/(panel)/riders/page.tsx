import { ChevronRight, Inbox, Settings2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminLoadFailed, AdminPageHeader, SECONDARY_BUTTON } from "@/components/admin/AdminShell";
import { RiderStatusPill } from "@/components/delivery/RiderParts";
import { VEHICLE_ICON } from "@/components/delivery/vehicle-icons";
import { Pager } from "@/components/inventory/SellerHeader";
import { requireRole } from "@/lib/auth/dal";
import { formatMobile } from "@/lib/auth/validation";
import { ADMIN_RIDER_TABS, adminRiderTab, loadAdminRiders, type AdminRiderTab } from "@/lib/delivery/data";
import { money } from "@/lib/delivery/format";
import { vehicleLabel, type AdminRiderSummary } from "@/lib/delivery/types";
import { when } from "@/lib/orders/format";

export const metadata: Metadata = { title: "Delivery partners" };

const EMPTY: Record<AdminRiderTab, { title: string; text: string }> = {
  review: { title: "Nothing to review", text: "Rider applications appear here when they're submitted." },
  active: { title: "No approved riders yet", text: "Riders you approve appear here, with whether they're online and the cash they hold." },
  onboarding: { title: "Nobody is applying right now", text: "Riders who started an application but haven't submitted it." },
  rejected: { title: "No applications sent back", text: "Applications you sent back appear here until the rider submits again." },
  suspended: { title: "No suspended riders", text: "Riders you suspend appear here." },
  all: { title: "No delivery partners yet", text: "People who sign up to deliver appear here." },
};

// /admin/riders?tab=active&page=1: one tab = one backend call (20 per page).
export default function AdminRidersPage({ searchParams }: PageProps<"/admin/riders">) {
  return (
    <>
      <AdminPageHeader
        title="Delivery partners"
        subtitle="Check each rider's documents and approve them, or send the application back with a reason."
        action={
          <Link href="/admin/delivery" className={SECONDARY_BUTTON}>
            <Settings2 aria-hidden className="size-4" />
            Delivery settings
          </Link>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: Pick<PageProps<"/admin/riders">, "searchParams">) {
  await requireRole("admin");
  const { tab: rawTab, page: rawPage } = await searchParams;
  const tab = adminRiderTab(rawTab);
  const page = Math.max(0, Number.parseInt(typeof rawPage === "string" ? rawPage : "0", 10) || 0);
  const href = (t: AdminRiderTab, p = 0) => {
    const q = new URLSearchParams();
    if (t !== "review") q.set("tab", t);
    if (p) q.set("page", String(p));
    const s = q.toString();
    return s ? `/admin/riders?${s}` : "/admin/riders";
  };
  const res = await loadAdminRiders(tab, page, href(tab, page));

  return (
    <div className="space-y-4">
      <nav aria-label="Rider status" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <ul className="flex w-max gap-2">
          {(Object.keys(ADMIN_RIDER_TABS) as AdminRiderTab[]).map((t) => {
            const current = t === tab;
            return (
              <li key={t}>
                <Link
                  href={href(t)}
                  aria-current={current ? "page" : undefined}
                  className={`flex min-h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition ${current ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line hover:ring-ink"}`}
                >
                  {ADMIN_RIDER_TABS[t].label}
                  {current && res.ok && <span className="ml-2 rounded-full bg-white/20 px-1.5 text-xs">{res.data.totalItems}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {!res.ok ? (
        <AdminLoadFailed message={res.error.message} />
      ) : res.data.items.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-line">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
            <Inbox aria-hidden className="size-8" />
          </span>
          <p className="mt-4 text-lg font-bold text-ink">{EMPTY[tab].title}</p>
          <p className="mt-1 max-w-sm text-sm text-muted">{EMPTY[tab].text}</p>
        </div>
      ) : (
        <>
          <ul className="overflow-hidden rounded-3xl bg-white ring-1 ring-line">
            {res.data.items.map((r) => (
              <RiderRow key={r.riderId} rider={r} />
            ))}
          </ul>
          <Pager page={page} totalPages={res.data.totalPages} href={(p) => href(tab, p)} />
        </>
      )}
    </div>
  );
}

function RiderRow({ rider: r }: { rider: AdminRiderSummary }) {
  const Icon = r.vehicleType ? VEHICLE_ICON[r.vehicleType] : null;
  const time = r.status === "PENDING_APPROVAL" && r.submittedAt ? `Submitted ${when(r.submittedAt)}` : `Joined ${when(r.createdAt)}`;
  return (
    <li className="border-b border-line last:border-b-0">
      <Link href={`/admin/riders/${r.riderId}`} className="flex items-center gap-4 p-4 transition hover:bg-surface sm:px-5">
        <span className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface text-ink ring-1 ring-line">
          {Icon ? <Icon aria-hidden className="size-5" /> : <span className="font-bold">{(r.name ?? "R").slice(0, 1)}</span>}
          {r.status === "ACTIVE" && <span aria-label={r.online ? "Online" : "Offline"} className={`absolute -right-0.5 -top-0.5 size-3.5 rounded-full border-2 border-white ${r.online ? "bg-green-500" : "bg-slate-300"}`} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-bold text-ink">{r.name ?? "Name not added"}</p>
            <RiderStatusPill status={r.status} />
          </div>
          <p className="mt-0.5 truncate text-sm text-muted">{[formatMobile(r.mobileNumber), vehicleLabel(r.vehicleType)].filter(Boolean).join(" · ")}</p>
          <p className="mt-0.5 text-xs text-muted">{time}</p>
        </div>
        {r.cashInHand > 0 && (
          <span className="hidden shrink-0 text-right sm:block">
            <span className="block text-xs text-muted">Holds</span>
            <span className="font-bold text-ink">{money(r.cashInHand)}</span>
          </span>
        )}
        <ChevronRight aria-hidden className="size-5 shrink-0 text-muted" />
      </Link>
    </li>
  );
}

function ListSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="h-10 w-96 max-w-full animate-pulse rounded-full bg-line/60" />
      <div className="h-72 animate-pulse rounded-3xl bg-line/60" />
    </div>
  );
}
