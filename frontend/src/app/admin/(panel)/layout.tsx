import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { AdminShell, AdminSkeleton } from "@/components/admin/AdminShell";
import { requireRole } from "@/lib/auth/dal";

// Every admin page except /admin/login (outside this (panel) group, which
// doesn't change URLs). Nothing of the panel, not even the menu, is sent until
// the backend confirms the visitor is an admin; anyone else goes to /admin/login.
// Each page checks again: a layout isn't re-run on every navigation.

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin | 360mart" },
  robots: { index: false, follow: false },
};

export default function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}

async function AdminGate({ children }: { children: ReactNode }) {
  await requireRole("admin");
  return <AdminShell>{children}</AdminShell>;
}
