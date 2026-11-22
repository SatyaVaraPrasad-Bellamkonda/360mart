"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// A header pill that shows when you're in its area (/seller…, /account…):
// tinted and marked aria-current, so it's clear which side of the site you're on.
// Its own small client component: usePathname must not sit in the app-wide AuthProvider.
// "tile" = the header's rounded square ("Your store"); "circle" = the round
// account button (photo or initials); "pill" = a round outlined pill.
export function NavPill({ href, area, label, className = "", shape = "pill", children }: { href: string; area: string; label: string; className?: string; shape?: "pill" | "tile" | "circle"; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === area || pathname.startsWith(`${area}/`);
  const look =
    shape === "tile" || shape === "circle"
      ? `${shape === "tile" ? "rounded-xl md:rounded-[14px]" : "rounded-full"} ${active ? "bg-brand-soft text-brand-deep ring-2 ring-brand/60" : "bg-[#e9e4dc] text-ink hover:bg-[#e1dbd1]"}`
      : `rounded-full ${active ? "bg-brand-soft text-brand-deep ring-1 ring-brand/50" : "bg-white text-ink ring-1 ring-line hover:ring-ink"}`;
  return (
    <Link href={href} aria-label={label} aria-current={active ? "page" : undefined} className={`flex min-h-10 items-center gap-2 text-sm font-semibold transition ${look} ${className}`}>
      {children}
    </Link>
  );
}
