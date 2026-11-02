import type { Metadata } from "next";
import { PolicyPage } from "@/components/legal/PolicyPage";

export const metadata: Metadata = {
  title: "Seller Agreement",
  description: "The agreement between 360mart and the local stores that sell on it: listings, orders, deliveries, commission and payouts.",
  alternates: { canonical: "/seller-agreement" },
};

// /seller-agreement: the current Seller Agreement from the backend (cached), shown as text only.
export default function Page() {
  return <PolicyPage type="SELLER_AGREEMENT" />;
}
