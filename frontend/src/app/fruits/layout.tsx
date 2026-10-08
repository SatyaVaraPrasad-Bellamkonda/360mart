import type { Metadata } from "next";
import { PreviewBanner } from "@/components/PreviewBanner";
import { USES_SAMPLE_DATA } from "@/lib/api";

// Applies to /fruits and every page below it.
export const metadata: Metadata = USES_SAMPLE_DATA ? { robots: { index: false, follow: true } } : {};

export default function FruitsLayout({ children }: LayoutProps<"/fruits">) {
  return (
    <>
      {USES_SAMPLE_DATA && <PreviewBanner />}
      {children}
    </>
  );
}
