import type { Metadata } from "next";
import { PolicyPage } from "@/components/legal/PolicyPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What personal data 360mart collects, why, who it is shared with, how long it is kept, and how to use your rights.",
  alternates: { canonical: "/privacy" },
};

// /privacy: the current Privacy Policy from the backend (cached), shown as text only.
export default function Page() {
  return <PolicyPage type="PRIVACY" />;
}
