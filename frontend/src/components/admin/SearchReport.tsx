"use client";

import { EyeOff, Eye, PackageSearch, Search, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { toastError, toastSuccess } from "@/components/Toaster";
import type { HiddenTerm, SearchTermStat } from "@/lib/home-page/service";
import { hideTermAction, unhideTermAction } from "@/lib/search/actions";
import { searchHref } from "@/lib/search/query";
import { dateTimeText } from "@/lib/stores/validation";

type Tab = "all" | "missing" | "hidden";

// The admin's search report: counts, the terms (most searched first, with how
// often nothing was found), and hiding terms from the home page's trending row.
export function SearchReport({ days, terms, hidden }: { days: 7 | 30; terms: SearchTermStat[]; hidden: HiddenTerm[] }) {
  const router = useRouter();
  const { sessionExpired } = useAuth();
  const [tab, setTab] = useState<Tab>("all");
  const [pending, startTransition] = useTransition();
  const [working, setWorking] = useState<string | null>(null);
  const [term, setTerm] = useState("");

  const total = terms.reduce((n, t) => n + t.searches, 0);
  const missing = terms.filter((t) => t.zeroResultSearches > 0).sort((a, b) => b.zeroResultSearches - a.zeroResultSearches);
  const top = Math.max(1, ...terms.map((t) => t.searches));
  const rows = tab === "missing" ? missing : terms;

  function act(key: string, work: () => Promise<{ ok: boolean; error?: { code: string; message: string } }>, done: string) {
    setWorking(key);
    startTransition(async () => {
      const res = await work();
      setWorking(null);
      if (!res.ok) return res.error?.code === "UNAUTHENTICATED" ? sessionExpired() : toastError(res.error?.message ?? "Something went wrong.");
      toastSuccess(done);
      router.refresh();
    });
  }
  const hide = (t: string) => act(`hide:${t}`, () => hideTermAction(t), `“${t}” won't show in trending searches.`);
  const unhide = (id: number, t: string) => act(`show:${id}`, () => unhideTermAction(id), `“${t}” can show in trending searches again.`);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Period" className="inline-flex gap-1 rounded-2xl bg-surface p-1 ring-1 ring-line">
          {([7, 30] as const).map((d) => (
            <Link key={d} href={`/admin/search?days=${d}`} aria-current={d === days ? "page" : undefined} className="flex min-h-10 items-center rounded-xl px-4 text-sm font-semibold text-muted aria-[current=page]:bg-white aria-[current=page]:text-ink aria-[current=page]:shadow-sm">
              Last {d} days
            </Link>
          ))}
        </div>
        <Link href="/admin/home" className="text-sm font-semibold text-brand-deep hover:underline">
          Home page designer
        </Link>
      </div>

      <dl className="grid grid-cols-3 gap-3">
        <Stat icon={Search} label="Searches" value={total} />
        <Stat icon={TrendingUp} label="Different terms" value={terms.length} />
        <Stat icon={PackageSearch} label="Found nothing" value={missing.length} tone="text-amber-700" />
      </dl>

      <div role="tablist" aria-label="Terms" className="flex gap-1 overflow-x-auto border-b border-line">
        {(
          [
            ["all", `All terms (${terms.length})`],
            ["missing", `Found nothing (${missing.length})`],
            ["hidden", `Hidden from trending (${hidden.length})`],
          ] as [Tab, string][]
        ).map(([value, label]) => (
          <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className="-mb-px min-h-11 shrink-0 border-b-2 border-transparent px-3 text-sm font-semibold text-muted aria-selected:border-ink aria-selected:text-ink">
            {label}
          </button>
        ))}
      </div>

      {tab === "missing" && missing.length > 0 && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">Shoppers looked for these and found nothing: products worth adding to the catalogue (or check the spelling of existing ones).</p>
      )}

      {tab !== "hidden" &&
        (rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">{tab === "missing" ? "Every search found something." : `No searches in the last ${days} days yet.`}</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-white ring-1 ring-line">
            {rows.map((t) => (
              <li key={t.term} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1 basis-48">
                  <a href={searchHref(t.term)} target="_blank" rel="noopener" className="font-semibold text-ink hover:underline">
                    {t.term}
                  </a>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${(t.searches / top) * 100}%` }} />
                  </div>
                </div>
                <p className="w-24 text-sm tabular-nums text-ink">
                  {t.searches.toLocaleString("en-IN")} <span className="text-muted">{t.searches === 1 ? "search" : "searches"}</span>
                </p>
                <p className="w-32 text-sm">{t.zeroResultSearches > 0 ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">{t.zeroResultSearches} found nothing</span> : <span className="text-xs text-muted">Found results</span>}</p>
                {t.hidden && t.hiddenTermId ? (
                  <button type="button" disabled={pending} onClick={() => unhide(t.hiddenTermId!, t.term)} className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink disabled:opacity-50">
                    <Eye aria-hidden className="size-4" />
                    {working === `show:${t.hiddenTermId}` ? "Showing…" : "Show in trending"}
                  </button>
                ) : (
                  <button type="button" disabled={pending} onClick={() => hide(t.term)} className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted ring-1 ring-line hover:text-ink hover:ring-ink disabled:opacity-50">
                    <EyeOff aria-hidden className="size-4" />
                    {working === `hide:${t.term}` ? "Hiding…" : "Hide from trending"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        ))}

      {tab === "hidden" && (
        <div className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (term.trim().length >= 2) {
                hide(term.trim());
                setTerm("");
              }
            }}
            className="flex gap-2"
          >
            <input value={term} onChange={(e) => setTerm(e.target.value)} maxLength={100} placeholder="A word to keep out of trending" aria-label="Term to hide" className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-base outline-none focus:border-ink focus:ring-2 focus:ring-brand/40" />
            <button type="submit" disabled={pending || term.trim().length < 2} className="min-h-11 shrink-0 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-50">
              Hide
            </button>
          </form>
          {hidden.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">Nothing hidden. Every popular search can show in trending.</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-white ring-1 ring-line">
              {hidden.map((h) => (
                <li key={h.hiddenTermId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{h.term}</p>
                    <p className="text-xs text-muted">Hidden {dateTimeText(h.createdAt)}</p>
                  </div>
                  <button type="button" disabled={pending} onClick={() => unhide(h.hiddenTermId, h.term)} className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink disabled:opacity-50">
                    <Eye aria-hidden className="size-4" />
                    {working === `show:${h.hiddenTermId}` ? "Showing…" : "Show again"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone = "text-ink" }: { icon: typeof Search; label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-line sm:p-4">
      <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted">
        <Icon aria-hidden className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </dt>
      <dd className={`mt-1 text-xl font-extrabold tabular-nums sm:text-2xl ${tone}`}>{value.toLocaleString("en-IN")}</dd>
    </div>
  );
}
