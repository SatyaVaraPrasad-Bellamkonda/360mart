"use client";

import { UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { initials, type CurrentUser } from "@/lib/auth/current-user";
import { refreshUserAction } from "@/lib/profile/actions";

type Props = {
  // The server's copy, used until useAuth() has the live userSession.
  user: Pick<CurrentUser, "firstName" | "lastName" | "profileImageUrl">;
  size: "sm" | "lg";
  previewUrl?: string | null; // a just-picked file, shown while it uploads
};

const SIZE = { sm: "size-7 text-xs", lg: "size-24 text-3xl" };

// Several avatars on one page (header + profile) may fail together when the
// link expires; they share one refresh instead of each calling /users/me.
let refreshing: ReturnType<typeof refreshUserAction> | null = null;
function refreshOnce() {
  refreshing ??= refreshUserAction().finally(() => {
    refreshing = null;
  });
  return refreshing;
}
const ICON = { sm: "size-4", lg: "size-10" };

// Round profile picture, or the user's initials / an icon when there is none.
// Picture links are signed and expire after ~1 hour: if one fails to load,
// fetch a fresh link once (refreshUserAction → /users/me) before giving up.
export function Avatar({ user: serverUser, size, previewUrl }: Props) {
  const { user: liveUser, replaceUser } = useAuth();
  // One source of truth: every avatar shows the live userSession, so an upload,
  // removal or link refresh updates all of them at once.
  const user = liveUser ?? serverUser;
  // Remember which link failed, so a new link (after refresh or upload) is tried again.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [retried, setRetried] = useState<string | null>(null);
  const url = previewUrl ?? (user.profileImageUrl && user.profileImageUrl !== failedUrl ? user.profileImageUrl : null);
  const imgRef = useRef<HTMLImageElement>(null);

  // The server-rendered <img> starts loading before React attaches onError, so
  // an already-expired link can fail unnoticed. Check once after hydration.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth === 0) img.dispatchEvent(new Event("error"));
  }, [url]);

  async function handleError() {
    if (previewUrl) return; // a local preview can't expire
    const broken = user.profileImageUrl;
    setFailedUrl(broken);
    if (!broken || retried === broken) return; // one retry per link, never a loop
    setRetried(broken);
    const res = await refreshOnce();
    if (res.ok) replaceUser(res.data);
  }

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-soft font-bold text-brand-deep ${SIZE[size]}`}
    >
      {url ? (
        // Plain <img>, not next/image: the link is short-lived and already a small
        // 512px image, so there's nothing to optimise and nothing worth caching.
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={imgRef} src={url} alt="" onError={handleError} className="size-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        (initials(user) ?? <UserRound aria-hidden className={ICON[size]} />)
      )}
    </span>
  );
}
