import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoadFailed, AdminPageHeader } from "@/components/admin/AdminShell";
import { DeliverySettingsForm } from "@/components/delivery/DeliverySettingsForm";
import { requireRole } from "@/lib/auth/dal";
import { loadDeliverySettings } from "@/lib/delivery/data";

export const metadata: Metadata = { title: "Delivery settings" };

const CRUMBS = [{ name: "Delivery partners", href: "/admin/riders" }];

// One call (GET /admin/delivery/settings); Save sends the whole document.
export default function DeliverySettingsPage() {
  return (
    <>
      <AdminPageHeader title="Delivery settings" subtitle="How we find riders for orders, and which vehicles can take which orders." crumbs={CRUMBS} />
      <Suspense fallback={<div aria-hidden className="h-[36rem] animate-pulse rounded-3xl bg-line/60" />}>
        <Settings />
      </Suspense>
    </>
  );
}

async function Settings() {
  await requireRole("admin");
  const res = await loadDeliverySettings("/admin/delivery");
  if (!res.ok) return <AdminLoadFailed message={res.error.message} />;
  return <DeliverySettingsForm key={res.data.updatedAt ?? "settings"} initial={res.data} />;
}
