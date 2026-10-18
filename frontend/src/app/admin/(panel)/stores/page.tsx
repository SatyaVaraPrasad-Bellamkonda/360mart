import { ChevronRight, Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminLoadFailed, AdminPageHeader } from "@/components/admin/AdminShell";
import { placeText, StatusPill, StoreLogo } from "@/components/stores/StoreParts";
import { requireRole } from "@/lib/auth/dal";
import { ADMIN_STORE_TABS, loadStores } from "@/lib/stores/data";
import type { Store, StoreStatus } from "@/lib/stores/types";
import { dateTimeText } from "@/lib/stores/validation";

export const metadata: Metadata = { title: "Stores" };

const TAB_LABEL: Record<string, string> = { PENDING_APPROVAL: "Waiting for review", ACTIVE: "Live", REJECTED: "Changes requested", DRAFT: "Drafts" };

const EMPTY: Record<string, { title: string; text: string }> = {
  PENDING_APPROVAL: { title: "Nothing to review", text: "Store applications appear here when shopkeepers submit them." },
  ACTIVE: { title: "No live stores yet", text: "Stores you approve appear here." },
  REJECTED: { title: "No stores waiting for changes", text: "Applications you send back with a reason appear here until the shopkeeper resubmits." },
  DRAFT: { title: "No drafts", text: "Applications shopkeepers have started but not submitted." },
};

// /admin/stores?status=ACTIVE: one tab = one backend call (pending by default, oldest first).
export default function AdminStoresPage({ searchParams }: PageProps<"/admin/stores">) {
  return (
    <>
      <AdminPageHeader title="Stores" subtitle="Check each application's details and documents, then approve it or send it back with a reason." />
      <Suspense fallback={<QueueSkeleton />}>
        <Queue searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Queue({ searchParams }: Pick<PageProps<"/admin/stores">, "searchParams">) {
  await requireRole("admin");
  const { status: param } = await searchParams;
  const status: StoreStatus = ADMIN_STORE_TABS.find((s) => s === param) ?? "PENDING_APPROVAL";
  const res = await loadStores(status, `/admin/stores?status=${status}`);
  return (
    <div className="space-y-4">
      <nav aria-label="Store status" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <ul className="flex w-max gap-2">
          {ADMIN_STORE_TABS.map((tab) => {
            const current = tab === status;
            return (
              <li key={tab}>
                <Link
                  href={tab === "PENDING_APPROVAL" ? "/admin/stores" : `/admin/stores?status=${tab}`}
                  aria-current={current ? "page" : undefined}
                  className={`flex min-h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition ${current ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line hover:ring-ink"}`}
                >
                  {TAB_LABEL[tab]}
                  {current && res.ok && <span className="ml-2 rounded-full bg-white/20 px-1.5 text-xs">{res.data.length}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {!res.ok ? (
        <AdminLoadFailed message={res.error.message} />
      ) : res.data.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-line">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <Inbox aria-hidden className="size-8" />
          </span>
          <p className="mt-4 text-lg font-bold text-ink">{EMPTY[status].title}</p>
          <p className="mt-1 max-w-sm text-sm text-muted">{EMPTY[status].text}</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-3xl bg-white ring-1 ring-line">
          {res.data.map((store) => (
            <StoreRow key={store.storeId} store={store} />
          ))}
        </ul>
      )}
    </div>
  );
}

function StoreRow({ store }: { store: Store }) {
  const when =
    store.status === "PENDING_APPROVAL"
      ? `Submitted ${dateTimeText(store.submittedAt)}`
      : store.status === "ACTIVE"
        ? `Approved ${dateTimeText(store.approvedAt)}`
        : store.status === "REJECTED"
          ? `Sent back ${dateTimeText(store.reviewedAt)}`
          : `Last saved ${dateTimeText(store.updatedAt)}`;
  return (
    <li className="border-b border-line last:border-b-0">
      <Link href={`/admin/stores/${store.storeId}`} className="flex items-center gap-4 p-4 transition hover:bg-surface sm:px-5">
        <StoreLogo store={store} className="size-12 rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-bold text-ink">{store.name}</p>
            <StatusPill status={store.status} />
          </div>
          <p className="mt-0.5 truncate text-sm text-muted">{placeText(store) ?? "Area not added"}</p>
          <p className="mt-0.5 text-xs text-muted">{when}</p>
        </div>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-muted" />
      </Link>
    </li>
  );
}

function QueueSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="h-10 w-80 max-w-full animate-pulse rounded-full bg-line/60" />
      <div className="h-72 animate-pulse rounded-3xl bg-line/60" />
    </div>
  );
}
