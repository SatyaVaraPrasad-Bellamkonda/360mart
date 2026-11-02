import type { Metadata } from "next";
import { PolicyPage } from "@/components/legal/PolicyPage";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "When you can ask for a refund or replacement on 360mart, how to report a problem with an order, and how long it takes.",
  alternates: { canonical: "/refund-policy" },
};

// /refund-policy: the current Refund Policy from the backend (cached), shown as text only.
export default function Page() {
  return <PolicyPage type="REFUND" />;
}
