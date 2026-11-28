"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { refreshUnread, resetUnread, useUnreadCount } from "./unread-store";

const INBOX = "/account/notifications";

// The header's bell: the offers inbox with the number not yet opened. Signed-in
// shoppers and shopkeepers only (admins don't shop). Shopkeepers' phone header
// is full ("Your store" + avatar), so for them it shows from `sm` up and the
// avatar carries a dot on phones instead (UnreadDot).
export function NotificationBell() {
  const { user, status } = useAuth();
  const pathname = usePathname();
  const count = useUnreadCount();
  const signedIn = status === "authenticated" && !!user && user.role !== "admin";
  const userId = signedIn ? user.userId : "";

  useEffect(() => {
    if (!signedIn) {
      if (status === "anonymous") resetUnread();
      return;
    }
    void refreshUnread(userId);
    const onVisible = () => document.visibilityState === "visible" && void refreshUnread(userId);
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [signedIn, status, userId]);

  if (!signedIn || pathname.startsWith("/admin")) return null;
  const active = pathname === INBOX;
  return (
    <Link
      href={INBOX}
      aria-label={count ? `Notifications, ${count} new` : "Notifications"}
      aria-current={active ? "page" : undefined}
      className={`relative size-10 shrink-0 items-center justify-center rounded-xl transition md:size-11 md:rounded-[14px] ${user.role === "seller" || user.role === "rider" ? "hidden sm:flex" : "flex"} ${active ? "bg-brand-soft text-brand-deep" : "text-ink hover:bg-[#f4f1ec]"}`}
    >
      <Bell aria-hidden strokeWidth={1.9} className={`size-5 ${count ? "origin-top motion-safe:animate-bell-ring" : ""}`} />
      {!!count && (
        <span key={count} className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ea6a0a] px-1 text-[10px] font-extrabold text-white ring-2 ring-white motion-safe:animate-pop-in">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

/** Phones, shopkeepers: a dot on the avatar while offers are unread (the bell is hidden there). */
export function UnreadDot() {
  const count = useUnreadCount();
  if (!count) return null;
  return (
    <span aria-hidden className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-[#ea6a0a] ring-2 ring-white sm:hidden" />
  );
}
