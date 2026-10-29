import { CalendarClock, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import type { SheetKind } from "@/lib/inventory/sheets";

// The two sheets side by side, so an owner on the wrong one finds the other:
// prices & stock (items without expiry dates) vs deliveries (expiry batches).
export function SheetSwitch({ current }: { current: SheetKind }) {
  const tabs = [
    { kind: "price" as const, href: "/seller/products/price-sheet", label: "Prices & stock", hint: "Prices, stock, sizes", icon: FileSpreadsheet },
    { kind: "batch" as const, href: "/seller/products/batch-sheet", label: "Deliveries", hint: "Expiry-date stock", icon: CalendarClock },
  ];
  return (
    <nav aria-label="Sheets" className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-1.5 ring-1 ring-line">
      {tabs.map((t) => {
        const active = t.kind === current;
        return (
          <Link
            key={t.kind}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-14 items-center gap-2.5 rounded-xl px-3 transition ${active ? "bg-ink text-white" : "text-ink hover:bg-surface"}`}
          >
            <t.icon aria-hidden className={`size-5 shrink-0 ${active ? "text-brand" : "text-muted"}`} />
            <span className="min-w-0">
              <span className="block text-sm font-bold">{t.label}</span>
              <span className={`block truncate text-xs ${active ? "text-white/70" : "text-muted"}`}>{t.hint}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
