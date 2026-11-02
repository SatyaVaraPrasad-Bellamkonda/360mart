import type { Metadata } from "next";
import { PolicyPage } from "@/components/legal/PolicyPage";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms for shopping and selling on 360mart: your account, orders, payments, deliveries and how we handle problems.",
  alternates: { canonical: "/terms" },
};

// /terms: the current Terms of Use from the backend (cached), shown as text only.
export default function Page() {
  return <PolicyPage type="TERMS" />;
}
