"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { toastSuccess } from "@/components/Toaster";
import { loadConsentsAction, type ConsentPrompt } from "@/lib/legal/actions";
import { ConsentDialog } from "./ConsentDialog";

const CHECKED_KEY = "360mart.consents.checked";
// Pages where the dialog would be in the way: reading the policies themselves, logging in or out, the admin panel.
const SKIP = /^\/(admin|terms|privacy|refund-policy|seller-agreement|contact|login|signup|forgot-password)(\/|$)/;

// "We've updated our terms": once per browser tab session and person (like an
// app start), checks whether a newer Terms / Privacy / Seller Agreement needs
// accepting, and if so asks with a dialog that can only be accepted (or log
// out). Two calls, once: the consents + the cached policy list. Checkout and
// store submit ask again by themselves when the backend says CONSENT_REQUIRED.
export function ConsentGate() {
  const { user, status } = useAuth();
  const [prompt, setPrompt] = useState<ConsentPrompt["pending"] | null>(null);
  const userId = status === "authenticated" && user && user.role !== "admin" ? user.userId : null;

  useEffect(() => {
    if (!userId || SKIP.test(window.location.pathname)) return;
    try {
      if (sessionStorage.getItem(CHECKED_KEY) === userId) return;
    } catch {
      // storage blocked: check every page load instead
    }
    let live = true;
    loadConsentsAction().then((res) => {
      if (!live || !res.ok) return; // a failed check is tried again on the next page load
      if (res.data.needsAcceptance) setPrompt(res.data.pending);
      else remember(userId);
    });
    return () => {
      live = false;
    };
  }, [userId]);

  if (!prompt || !userId) return null;
  return (
    <ConsentDialog
      open
      reason="updated"
      pending={prompt}
      onAccepted={() => {
        remember(userId);
        setPrompt(null);
        toastSuccess("Thanks. You've accepted the latest terms.");
      }}
    />
  );
}

function remember(userId: string) {
  try {
    sessionStorage.setItem(CHECKED_KEY, userId);
  } catch {
    // fine: it's only to avoid asking the backend again in this tab
  }
}
