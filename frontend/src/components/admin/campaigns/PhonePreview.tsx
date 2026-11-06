"use client";

import { ChevronDown, Clock, Timer } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { DEFAULT_TIMER_LABEL, TIMER_COLOURS, type TimerStyle, type TimerTheme } from "@/lib/campaigns/types";
import { clock, when } from "@/lib/orders/format";

export type PreviewTimer = { style: TimerStyle; label: string | null; theme: TimerTheme | null };

// A clock for the preview's countdown, ticking every second in the browser
// (null on the server, so the HTML never disagrees with the first paint).
const ticker = {
  subscribe(onChange: () => void) {
    const t = setInterval(onChange, 1000);
    return () => clearInterval(t);
  },
  now: () => Math.floor(Date.now() / 1000) * 1000,
};

/** "2:59:41" (or "41:05" under an hour) left until `iso`; "0:00" once it has passed. */
function left(iso: string | null, now: number | null): string {
  if (!iso || now === null) return "--:--";
  const s = Math.max(0, Math.floor((Date.parse(iso) - now) / 1000));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// How the campaign looks on a phone: the push on the lock screen (collapsed
// = title + one line, expanded = the picture too) and the card in the app's /
// website's inbox. A drawing for the admin, not a promise of pixel-exact
// rendering: every phone maker draws notifications a little differently.
export function PhonePreview({ title, body, imageUrl, link, expiresAt, timer }: { title: string; body: string; imageUrl: string | null; link: string; expiresAt: string | null; timer?: PreviewTimer }) {
  const [view, setView] = useState<"push" | "inbox">("push");
  const [phone, setPhone] = useState<"android" | "iphone">("android");
  const [expanded, setExpanded] = useState(true);
  const now = useSyncExternalStore(ticker.subscribe, ticker.now, () => null);
  const t = title.trim() || "Your title";
  const style = timer?.style ?? "NONE";
  const counting = style !== "NONE";
  // iPhones show no ticking clock: the backend adds the end time to the text.
  const iphoneEnds = counting && expiresAt && phone === "iphone" ? `\nEnds ${clock(expiresAt)}` : "";
  const b = (body.trim() || "Your message shows here.") + iphoneEnds;
  const colours = TIMER_COLOURS[timer?.theme ?? "GOLD"];
  const label = timer?.label?.trim() || DEFAULT_TIMER_LABEL;
  const androidTimer = counting && phone === "android";

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
            <div className="px-3 pt-4">
              <div role="tablist" aria-label="Phone" className="mx-auto flex w-fit gap-1 rounded-full bg-black/25 p-0.5 backdrop-blur">
                {(["android", "iphone"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="tab"
                    aria-selected={phone === p}
                    onClick={() => setPhone(p)}
                    className={`min-h-8 rounded-full px-3 text-[11px] font-bold transition ${phone === p ? "bg-white text-ink" : "text-white/90 hover:text-white"}`}
                  >
                    {p === "android" ? "Android" : "iPhone"}
                  </button>
                ))}
              </div>
              <p aria-hidden className="mt-3 text-center text-5xl font-light tracking-tight text-white/95 tabular-nums">9:41</p>
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
                      {androidTimer && style === "SIMPLE" && (
                        <span className="inline-flex items-center gap-0.5 font-bold tabular-nums text-ink">
                          · <Timer aria-hidden className="size-3" /> {left(expiresAt, now)}
                        </span>
                      )}
                      <ChevronDown aria-hidden className={`ml-auto size-4 transition ${expanded ? "rotate-180" : ""}`} />
                    </span>
                    {androidTimer && style === "SIMPLE" && <span className="block truncate text-[11px] font-semibold text-muted">{label}</span>}
                    <span className="block truncate text-sm font-bold text-ink">{t}</span>
                    <span className={`block whitespace-pre-line break-words text-[13px] leading-snug text-ink/80 ${expanded ? "line-clamp-6" : "line-clamp-1"}`}>{b}</span>
                  </span>
                  {!expanded && imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- a local preview or the uploaded picture
                    <img src={imageUrl} alt="" className="size-10 shrink-0 rounded-md object-cover" />
                  )}
                </span>
                {androidTimer && style === "BANNER" && (
                  <span className="flex items-center justify-between gap-2 px-3 py-2" style={{ background: colours.background, color: colours.text }}>
                    <span className="min-w-0 truncate text-xs font-bold">{label}</span>
                    <span className="shrink-0 text-xl font-extrabold tabular-nums leading-none">{left(expiresAt, now)}</span>
                  </span>
                )}
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
        {counting && (expiresAt ? (phone === "iphone" ? " iPhones get no ticking clock: the end time is added to the text." : " The clock ticks down to the offer end.") : " Set the offer end to start the countdown.")}
      </figcaption>
    </figure>
  );
}
