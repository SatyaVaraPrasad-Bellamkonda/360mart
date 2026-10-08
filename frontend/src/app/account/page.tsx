import type { Metadata } from "next";
import { Suspense } from "react";
import { ComingSoonGrid, DashboardShell, DashboardSkeleton } from "@/components/auth/DashboardShell";
import { requireRole } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "My Account", robots: { index: false, follow: false } };

export default function AccountPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <CustomerDashboard />
    </Suspense>
  );
}

async function CustomerDashboard() {
  const user = await requireRole("customer");
  return (
    <DashboardShell badge="Customer" title="My account" subtitle={`Signed in as ${user.displayName}`}>
      <ComingSoonGrid
        items={[
          { icon: "📦", title: "My orders", text: "Track current orders and see past purchases." },
          { icon: "📍", title: "Saved addresses", text: "Add home and work addresses for faster checkout." },
          { icon: "🙍", title: "Profile", text: "Update your name and contact details." },
        ]}
      />
    </DashboardShell>
  );
}
