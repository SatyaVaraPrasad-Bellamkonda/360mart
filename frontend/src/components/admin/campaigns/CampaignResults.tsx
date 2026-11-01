"use client";

import { BellRing, CalendarClock, Inbox, MousePointerClick, Users } from "lucide-react";
import type { ReactNode } from "react";
import { ACTIVITY_OPTIONS, count, openRate, PLATFORM_LABEL, ROLE_LABEL, STAT_ROWS } from "@/lib/campaigns/format";
import type { Campaign, CampaignAudience } from "@/lib/campaigns/types";
import { AUDIENCE_ROLES } from "@/lib/campaigns/types";
import { when } from "@/lib/orders/format";

// Where a scheduled / sending / finished campaign stands: who it went to and
// how. While it's sending the parent re-reads it every 5 s, so the bar fills.
export function CampaignResults({ campaign }: { campaign: Campaign }) {
  const s = campaign.stats;
  if (campaign.status === "SCHEDULED") {
    return (
      <div className="flex items-start gap-4 rounded-3xl bg-sky-50 p-5 ring-1 ring-sky-200">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 ring-1 ring-sky-200">
          <CalendarClock aria-hidden className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-bold text-sky-950">Goes out {campaign.sendAt ? when(campaign.sendAt) : "soon"} (India time)</p>
          <p className="mt-0.5 text-sm text-sky-900/80">The audience is worked out at that moment. Until then you can still edit it, send a test, change the time or move it back to drafts.</p>
        </div>
      </div>
    );
  }
  if (!s) return null;

  const target = campaign.targetCount ?? 0;
  const handled = Math.max(0, target - s.pending);
  const inboxOnly = s.noDevice + s.capped;
  const rate = openRate(s);
  const sending = campaign.status === "SENDING";

  return (
    <section aria-label="Results" className="space-y-4 rounded-3xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-ink">Results</h2>
        <p className="text-sm text-muted">
          {sending ? `Started ${when(campaign.startedAt)} · updates every few seconds` : campaign.status === "CANCELLED" ? `Cancelled ${when(campaign.cancelledAt)}` : campaign.finishedAt ? `Finished ${when(campaign.finishedAt)}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile icon={<Users aria-hidden className="size-5" />} label="People" value={count(target)} tone="bg-slate-100 text-slate-700" />
        <Tile icon={<BellRing aria-hidden className="size-5" />} label="Push delivered" value={count(s.sent)} tone="bg-green-100 text-green-700" />
        <Tile icon={<Inbox aria-hidden className="size-5" />} label="Inbox only" value={count(inboxOnly)} tone="bg-sky-100 text-sky-700" />
        <Tile icon={<MousePointerClick aria-hidden className="size-5" />} label="Opened" value={count(s.opened)} sub={rate === null ? undefined : `${rate}% open rate`} tone="bg-amber-100 text-amber-800" />
      </div>

      {target > 0 && (
        <div>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-semibold text-ink">{sending ? "Sending" : "Delivery"}</span>
            <span className="tabular-nums text-muted">
              {count(handled)} of {count(target)} handled
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={target}
            aria-valuenow={handled}
            aria-label="People handled"
            className="mt-2 flex h-3 overflow-hidden rounded-full bg-surface ring-1 ring-line"
          >
            {STAT_ROWS.map((r) => (s[r.key] ? <span key={r.key} className={`${r.tone} h-full transition-[width] duration-700`} style={{ width: `${(s[r.key] / target) * 100}%` }} /> : null))}
            {sending && s.pending > 0 && <span className="h-full flex-1 bg-[repeating-linear-gradient(45deg,transparent_0_6px,rgb(0_0_0/0.05)_6px_12px)] motion-safe:animate-pulse" />}
          </div>
        </div>
      )}

      <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {s.pending > 0 && <Row tone="bg-surface ring-1 ring-line" label="Waiting to send" value={s.pending} />}
        {STAT_ROWS.map((r) => (
          <Row key={r.key} tone={r.tone} label={r.label} value={s[r.key]} />
        ))}
      </ul>
      <p className="text-xs text-muted">Open rate = opened ÷ (push delivered + inbox only). Opens are counted from the push and from the inbox.</p>
    </section>
  );
}

function Tile({ icon, label, value, sub, tone }: { icon: ReactNode; label: string; value: string; sub?: string; tone: string }) {
  return (
    <div className="rounded-2xl bg-surface p-4">
      <span className={`flex size-9 items-center justify-center rounded-xl ${tone}`}>{icon}</span>
      <p key={value} className="mt-3 text-2xl font-extrabold tabular-nums text-ink motion-safe:animate-pop-in">
        {value}
      </p>
      <p className="text-sm text-muted">{label}</p>
      {sub && <p className="text-xs font-semibold text-amber-800">{sub}</p>}
    </div>
  );
}

function Row({ tone, label, value }: { tone: string; label: string; value: number }) {
  return (
    <li className={`flex min-h-9 items-center gap-2 text-sm ${value ? "text-ink" : "text-muted"}`}>
      <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${tone}`} />
      <span className="min-w-0 flex-1">{label}</span>
      <span className="font-semibold tabular-nums">{count(value)}</span>
    </li>
  );
}

/** The audience in plain words, one line per filter used. */
export function audienceLines(a: CampaignAudience | null, names: Record<number, string>): string[] {
  const audience = a ?? {};
  const roles = audience.roles?.length ? audience.roles : [...AUDIENCE_ROLES];
  const lines = [roles.length === AUDIENCE_ROLES.length ? "Customers and shop owners" : roles.map((r) => ROLE_LABEL[r]).join(", ")];
  if (audience.platforms?.length) lines.push(`With the app on ${audience.platforms.map((p) => PLATFORM_LABEL[p]).join(" or ")}`);
  const where = [...(audience.cities ?? []).map((c) => c.replace(/\b\p{L}/gu, (m) => m.toUpperCase())), ...(audience.pincodes ?? [])];
  if (where.length) lines.push(`In ${where.join(", ")}`);
  const activity = audience.orderActivity ?? "ANY";
  if (activity !== "ANY") {
    const label = ACTIVITY_OPTIONS.find((o) => o.value === activity)?.label ?? activity;
    lines.push(audience.activityDays ? `${label} (${audience.activityDays === 1 ? "1 day" : `${audience.activityDays} days`})` : label);
  }
  if (audience.boughtCategoryIds?.length) lines.push(`Bought from ${audience.boughtCategoryIds.map((id) => names[id] ?? `subcategory no. ${id}`).join(", ")}`);
  if (audience.joinedWithinDays) lines.push(`Signed up in the last ${audience.joinedWithinDays === 1 ? "day" : `${audience.joinedWithinDays} days`}`);
  return lines;
}
