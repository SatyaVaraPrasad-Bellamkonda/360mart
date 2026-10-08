import type { Metadata } from "next";
import { Suspense } from "react";
import { ComingSoonGrid, DashboardShell, DashboardSkeleton } from "@/components/auth/DashboardShell";
import { requireRole } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Seller Dashboard", robots: { index: false, follow: false } };

export default function SellerDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <SellerDashboard />
    </Suspense>
  );
}

async function SellerDashboard() {
  const user = await requireRole("seller");
  return (
    <DashboardShell badge="Shopkeeper" title={user.displayName} subtitle="Your store dashboard">
      <ComingSoonGrid
        items={[
          { icon: "🧾", title: "Orders", text: "Accept new orders and mark them packed and delivered." },
          { icon: "🍎", title: "Products & stock", text: "Add products, set prices and update stock." },
          { icon: "🏪", title: "Store settings", text: "Shop timings, delivery areas and your store page." },
        ]}
      />
    </DashboardShell>
  );
}
