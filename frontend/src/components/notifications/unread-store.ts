"use client";

import { useSyncExternalStore } from "react";
import { api } from "@/lib/api-client";

// The offers inbox's unread number, shared by the header bell and the inbox
// page (like an AngularJS service both controllers inject). Read once when the
// header starts, again when the tab comes back after a minute away; the inbox
// lowers it as offers are opened. Never polled on a timer.

let unread = 0;
let readAt = 0;
let owner = ""; // whose number it is: another account signing in starts afresh
let changes = 0; // local changes (an offer opened): a read that started before one is out of date
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUnreadCount(): number {
  return useSyncExternalStore(
    subscribe,
    () => unread,
    () => 0,
  );
}

/** Ask the backend unless it was asked for this user within `maxAgeMs`. */
export function refreshUnread(userId: string, maxAgeMs = 60_000): Promise<void> {
  if (userId !== owner) {
    owner = userId;
    unread = 0;
    readAt = 0;
    emit();
  }
  if (loading) return loading;
  if (readAt && Date.now() - readAt < maxAgeMs) return Promise.resolve();
  const startedAt = changes;
  // Straight from the browser (GET /api/v1/users/me/notifications/unread-count); a badge is never worth an error, so any problem = 0.
  loading = api<{ unread: number }>("/users/me/notifications/unread-count")
    .then((res) => (res.ok ? Math.max(0, Number(res.data?.unread) || 0) : 0))
    .then((n) => {
      if (startedAt !== changes) return;
      unread = n;
      readAt = Date.now();
      emit();
    })
    .catch(() => {})
    .finally(() => {
      loading = null;
    });
  return loading;
}

export function setUnread(n: number) {
  changes++;
  unread = Math.max(0, n);
  readAt = Date.now();
  emit();
}

/** One offer opened: one fewer unread. */
export function markOneRead() {
  setUnread(unread - 1);
}

/** Signed out: forget the number (another account may sign in next). */
export function resetUnread() {
  owner = "";
  unread = 0;
  readAt = 0;
  emit();
}
