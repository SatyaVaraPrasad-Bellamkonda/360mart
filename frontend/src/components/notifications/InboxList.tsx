"use client";

import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { markOpenedAction } from "@/lib/campaigns/inbox-actions";
import type { InboxItem } from "@/lib/campaigns/types";
import { when } from "@/lib/orders/format";
import { markOneRead, setUnread } from "./unread-store";

// The offers inbox. Tapping an offer marks it opened (backend counts it for
// the campaign's results), then follows its link, which is always a page of
// our own site. An offer without a link just becomes read.
// `complete` = every offer is on this page, so the bell can take its number from it.
export function InboxList({ items, complete }: { items: InboxItem[]; complete: boolean }) {
  const { sessionExpired } = useAuth();
  // Opened here (kept when the page comes back from back/forward).
  const [opened, setOpened] = useState<Set<string>>(() => new Set());

  // The whole list is here: its unread items are the exact number. Offers opened
  // on this page are left out too (a fresh list may be read before "opened" lands).
  useEffect(() => {
    if (complete) setUnread(items.filter((i) => !i.opened && !opened.has(i.campaignId)).length);
  }, [complete, items, opened]);

  function open(item: InboxItem) {
    if (item.opened || opened.has(item.campaignId)) return;
    setOpened((s) => new Set(s).add(item.campaignId));
    // Right away: a link leaves this page before any effect here would run.
    markOneRead();
    // Not awaited: a link opens at once; the call finishes in the background.
    void markOpenedAction(item.campaignId).then((res) => {
      if (!res.ok && res.error.code === "UNAUTHENTICATED") sessionExpired();
    });
  }

  return (
    <ul className="space-y-3">
      {items.map((item, i) => {
        const unread = !item.opened && !opened.has(item.campaignId);
        const body = <Card item={item} unread={unread} />;
        const shell = `group block w-full overflow-hidden rounded-3xl border text-left transition motion-safe:animate-fade-up ${unread ? "border-brand/40 bg-white shadow-sm" : "border-line bg-white/70"} hover:border-ink`;
        const style = { animationDelay: `${Math.min(i, 6) * 50}ms` };
        return (
          <li key={item.campaignId}>
            {item.link ? (
              <Link href={item.link} prefetch={false} onClick={() => open(item)} className={shell} style={style}>
                {body}
              </Link>
            ) : (
              <button type="button" onClick={() => open(item)} className={shell} style={style}>
                {body}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Card({ item, unread }: { item: InboxItem; unread: boolean }) {
  return (
    <>
      {item.imageUrl && (
        <span className="block aspect-[2/1] w-full overflow-hidden bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element -- a signed link to the admin's upload */}
          <img src={item.imageUrl} alt="" loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-[1.02]" />
        </span>
      )}
      <span className="flex gap-3 p-4 sm:p-5">
        <span aria-hidden className={`mt-1.5 size-2.5 shrink-0 rounded-full ${unread ? "bg-brand" : "bg-transparent"}`} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`break-words text-base text-ink ${unread ? "font-extrabold" : "font-semibold"}`}>{item.title}</span>
            {unread && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-deep">New</span>}
          </span>
          <span className="mt-1 block whitespace-pre-line break-words text-sm text-muted">{item.body}</span>
          <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
            <time dateTime={item.receivedAt}>{when(item.receivedAt)}</time>
            {item.expiresAt && (
              <Chip>
                <Clock aria-hidden className="size-3.5" />
                Ends {when(item.expiresAt)}
              </Chip>
            )}
            {item.link && (
              <span className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-ink">
                View offer
                <ArrowRight aria-hidden className="size-4 transition group-hover:translate-x-0.5" />
              </span>
            )}
          </span>
          {unread && <span className="sr-only">Not opened yet.</span>}
        </span>
      </span>
    </>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800 ring-1 ring-amber-200">{children}</span>;
}
