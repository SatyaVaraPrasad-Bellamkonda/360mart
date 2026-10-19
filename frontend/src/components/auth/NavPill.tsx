"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// A header pill that shows when you're in its area (/seller…, /account…):
// tinted and marked aria-current, so it's clear which side of the site you're on.
// Its own small client component: usePathname must not sit in the app-wide AuthProvider.
export function NavPill({ href, area, label, className = "", children }: { href: string; area: string; label: string; className?: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === area || pathname.startsWith(`${area}/`);
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-10 items-center gap-2 rounded-full text-sm font-semibold transition ${
        active ? "bg-brand-soft text-brand-deep ring-1 ring-brand/50" : "bg-white text-ink ring-1 ring-line hover:ring-ink"
      } ${className}`}
    >
      {children}
    </Link>
  );
}
