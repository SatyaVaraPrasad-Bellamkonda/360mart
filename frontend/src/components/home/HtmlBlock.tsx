import { CalendarClock, CalendarX2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";
import { htmlBlockState, looksUnsafe } from "@/lib/home-page/html-block";
import type { HtmlBlockSection } from "@/lib/home-page/types";
import { when } from "@/lib/orders/format";
import { HtmlBlockSchedule } from "./HtmlBlockSchedule";

/**
 * An admin's HTML block on the home page. The backend has cleaned the HTML
 * (allowed tags and inline CSS only), so it's shown as given, inside a box it
 * can't escape (`.html-block`: clipped, its own stacking and layout context).
 * Phones get mobileHtml when there is one (a CSS switch: the page is cached and
 * rendered on the server, so it can't be picked in JavaScript). With a link,
 * the whole block is one link. `preview` = the admin's full preview: shown
 * even outside its schedule, with a label saying so.
 */
export function HtmlBlock({ section: s, id, serverNow, preview }: { section: HtmlBlockSection; id: string; serverNow: number; preview?: boolean }) {
  const html = s.html ?? "";
  const mobile = s.mobileHtml?.trim() ? s.mobileHtml : null;
  // The backend should never let these through; if it ever does, nothing is shown.
  if (looksUnsafe(html) || (mobile && looksUnsafe(mobile))) {
    return preview ? (
      <p className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 ring-1 ring-red-200">
        <ShieldAlert aria-hidden className="size-4 shrink-0" /> This HTML block has content the site won&apos;t show. Open it in the designer and save it again.
      </p>
    ) : null;
  }

  const full = s.width === "FULL";
  const body = (
    <>
      {mobile ? (
        <>
          <div className="html-block md:hidden" dangerouslySetInnerHTML={{ __html: mobile }} />
          <div className="html-block hidden md:block" dangerouslySetInnerHTML={{ __html: html }} />
        </>
      ) : (
        <div className="html-block" dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </>
  );
  const linked = s.linkPath ? (
    <Link
      href={s.linkPath}
      aria-label={s.linkLabel || undefined}
      className={`group block transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand ${full ? "" : "rounded-2xl hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ink/10"}`}
    >
      {body}
    </Link>
  ) : (
    body
  );

  const heading = s.title ? (
    <div className={full ? "mx-auto max-w-6xl px-4" : ""}>
      <SectionHeading id={id} title={s.title} subtitle={s.subtitle || undefined} />
    </div>
  ) : null;
  const content = (
    <section aria-labelledby={s.title ? id : undefined} aria-label={s.title ? undefined : s.linkLabel || "Announcement"}>
      {heading}
      {linked}
    </section>
  );

  if (preview) {
    const state = htmlBlockState(s, serverNow);
    if (state === "LIVE") return content;
    return (
      <div className="space-y-2">
        <p className={`flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${state === "ENDED" ? "bg-slate-200 text-slate-700" : "bg-sky-100 text-sky-800"} ${full ? "mx-4" : ""}`}>
          {state === "ENDED" ? <CalendarX2 aria-hidden className="size-3.5" /> : <CalendarClock aria-hidden className="size-3.5" />}
          {state === "ENDED" ? `Ended ${when(s.endsAt)}: shoppers don't see it` : `Scheduled: starts ${when(s.startsAt)}`}
        </p>
        <div className="opacity-60">{content}</div>
      </div>
    );
  }
  if (!s.startsAt && !s.endsAt) return content;
  return (
    <HtmlBlockSchedule startsAt={s.startsAt ?? null} endsAt={s.endsAt ?? null} serverNow={serverNow}>
      {content}
    </HtmlBlockSchedule>
  );
}
