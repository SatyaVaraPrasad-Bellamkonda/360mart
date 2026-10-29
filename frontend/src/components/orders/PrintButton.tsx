"use client";

import { Download } from "lucide-react";

/** "Download PDF": the browser's print dialog, where "Save as PDF" is one of the printers. */
export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85 active:scale-95">
      <Download aria-hidden className="size-4" />
      Download PDF
    </button>
  );
}
