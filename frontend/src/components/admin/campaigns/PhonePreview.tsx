"use client";

import { ChevronDown, Clock } from "lucide-react";
import { useState } from "react";
import { when } from "@/lib/orders/format";

// How the campaign looks on a phone: the push on the lock screen (collapsed
// = title + one line, expanded = the picture too) and the card in the app's /
// website's inbox. A drawing for the admin, not a promise of pixel-exact
// rendering: every phone maker draws notifications a little differently.
export function PhonePreview({ title, body, imageUrl, link, expiresAt }: { title: string; body: string; imageUrl: string | null; link: string; expiresAt: string | null }) {
  const [view, setView] = useState<"push" | "inbox">("push");
  const [expanded, setExpanded] = useState(true);
  const t = title.trim() || "Your title";
  const b = body.trim() || "Your message shows here.";

  return (
    <figure className="space-y-3">
      <div role="tablist" aria-label="Preview" className="flex gap-1 rounded-2xl bg-white p-1 ring-1 ring-line">
        {(["push", "inbox"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`flex min-h-10 flex-1 items-center justify-center rounded-xl text-sm font-semibold transition ${view === v ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
          >
            {v === "push" ? "Phone notification" : "Inbox"}
          </button>
        ))}
      </div>

      <div className="mx-auto w-full max-w-[19rem] rounded-[2.4rem] bg-ink p-2.5 shadow-xl">
        <div className={`relative min-h-[26rem] overflow-hidden rounded-[1.9rem] ${view === "push" ? "bg-gradient-to-br from-indigo-500 via-violet-500 to-amber-400" : "bg-surface"}`}>
          <div aria-hidden className="mx-auto mt-2 h-5 w-24 rounded-full bg-ink" />
          {view === "push" ? (
            <div className="px-3 pt-8">
              <p aria-hidden className="text-center text-5xl font-light tracking-tight text-white/95 tabular-nums">9:41</p>
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                aria-expanded={expanded}
                className="mt-8 block w-full overflow-hidden rounded-2xl bg-white/90 text-left shadow-lg backdrop-blur motion-safe:animate-pop-in"
              >
                <span className="flex items-start gap-2.5 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- the app icon */}
                  <img src="/icon.png" alt="" className="size-8 shrink-0 rounded-lg bg-white ring-1 ring-line" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-[11px] text-muted">
                      <span className="font-semibold text-ink">360mart</span>· now
                      <ChevronDown aria-hidden className={`ml-auto size-4 transition ${expanded ? "rotate-180" : ""}`} />
                    </span>
                    <span className="block truncate text-sm font-bold text-ink">{t}</span>
                    <span className={`block whitespace-pre-line break-words text-[13px] leading-snug text-ink/80 ${expanded ? "line-clamp-6" : "line-clamp-1"}`}>{b}</span>
                  </span>
                  {!expanded && imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- a local preview or the uploaded picture
                    <img src={imageUrl} alt="" className="size-10 shrink-0 rounded-md object-cover" />
                  )}
                </span>
                {expanded && imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- a local preview or the uploaded picture
                  <img src={imageUrl} alt="" className="aspect-[2/1] w-full object-cover" />
                )}
              </button>
              <p className="mt-2 text-center text-[11px] font-semibold text-white/85">Tap the notification to {expanded ? "collapse" : "expand"} it</p>
            </div>
          ) : (
            <div className="px-3 pt-4">
              <p className="px-1 text-sm font-extrabold text-ink">Notifications</p>
              <div className="mt-3 overflow-hidden rounded-2xl border border-brand/40 bg-white shadow-sm motion-safe:animate-pop-in">
                {imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- a local preview or the uploaded picture
                  <img src={imageUrl} alt="" className="aspect-[2/1] w-full object-cover" />
                )}
                <div className="flex gap-2 p-3">
                  <span aria-hidden className="mt-1 size-2 shrink-0 rounded-full bg-brand" />
                  <div className="min-w-0">
                    <p className="break-words text-sm font-extrabold text-ink">{t}</p>
                    <p className="mt-0.5 whitespace-pre-line break-words text-xs text-muted">{b}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                      just now
                      {expiresAt && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-800 ring-1 ring-amber-200">
                          <Clock aria-hidden className="size-3" />
                          Ends {when(expiresAt)}
                        </span>
                      )}
                      {link && <span className="ml-auto font-semibold text-ink">View offer</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <figcaption className="text-center text-xs text-muted">
        {link ? (
          <>
            Opens <span className="font-semibold text-ink">{link}</span> when tapped.
          </>
        ) : (
          "No link: tapping opens the inbox."
        )}
        {imageUrl && " iPhones show the text without the picture for now."}
      </figcaption>
    </figure>
  );
}
