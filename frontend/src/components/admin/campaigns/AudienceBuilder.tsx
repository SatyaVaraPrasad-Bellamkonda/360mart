"use client";

import { Check, LoaderCircle, Smartphone, Users } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Switch } from "@/components/admin/page-editor/parts";
import { ACTIVITY_OPTIONS, count, PLATFORM_LABEL, ROLE_LABEL } from "@/lib/campaigns/format";
import { AUDIENCE_ROLES, PLATFORMS, type AudienceCount } from "@/lib/campaigns/types";
import { LIMITS, needsDays, type CampaignDraft } from "@/lib/campaigns/validation";
import { CategoryChooser, type CategoryOption } from "./CategoryChooser";
import { ChipInput } from "./ChipInput";

export type CountState = { state: "idle" | "loading" } | { state: "ready"; count: AudienceCount } | { state: "error"; message: string };

// Who gets the campaign. Every filter combines with AND; anything left empty
// doesn't narrow it. Errors are keyed like the backend's ("audience.cities").
export function AudienceBuilder({
  draft,
  set,
  errors,
  categories,
  names,
  onNames,
  live,
}: {
  draft: CampaignDraft;
  set: (patch: Partial<CampaignDraft>) => void;
  errors: Record<string, string>;
  categories: CategoryOption[];
  names: Record<number, string>;
  onNames: (more: Record<number, string>) => void;
  live: CountState;
}) {
  const err = (k: string) => errors[`audience.${k}`];
  const categoryError = err("boughtCategoryIds") ?? Object.entries(errors).find(([k]) => k.startsWith("audience.boughtCategoryIds["))?.[1];

  return (
    <div className="space-y-6">
      <LiveCount live={live} />

      <Group title="Who" hint="Shop owners also shop, so a shopper offer reaches them too." error={err("roles")}>
        <div className="grid gap-2 sm:grid-cols-2">
          {AUDIENCE_ROLES.map((r) => (
            <CheckCard key={r} checked={draft.roles.includes(r)} onChange={(on) => set({ roles: on ? [...draft.roles, r] : draft.roles.filter((x) => x !== r) })} label={ROLE_LABEL[r]} />
          ))}
        </div>
      </Group>

      <Group title="Phones" hint="Leave both off for everyone (people without the app still get it in their inbox). Picking one sends only to people logged in to the app on that kind of phone.">
        <div className="grid gap-2 sm:grid-cols-2">
          {PLATFORMS.map((p) => (
            <CheckCard key={p} checked={draft.platforms.includes(p)} onChange={(on) => set({ platforms: on ? [...draft.platforms, p] : draft.platforms.filter((x) => x !== p) })} label={PLATFORM_LABEL[p]} icon={<Smartphone aria-hidden className="size-4" />} />
          ))}
        </div>
      </Group>

      <Group title="Where" hint="Matched with each person's default address. With both cities and pincodes, either one counts.">
        <div className="grid gap-4 lg:grid-cols-2">
          <ChipInput label="Cities" hint="Type a city and press Enter." placeholder="Hyderabad" kind="city" max={LIMITS.cities} values={draft.cities} onChange={(cities) => set({ cities })} error={err("cities")} />
          <ChipInput label="Pincodes" hint="Paste many at once, separated by spaces or commas." placeholder="500072" kind="pincode" max={LIMITS.pincodes} values={draft.pincodes} onChange={(pincodes) => set({ pincodes })} error={err("pincodes")} />
        </div>
      </Group>

      <Group title="Orders" hint="Only delivered orders count.">
        <div role="radiogroup" aria-label="Orders" className="grid gap-2 sm:grid-cols-2">
          {ACTIVITY_OPTIONS.map((o) => (
            <label
              key={o.value}
              className="flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl p-3 ring-1 ring-line transition hover:ring-ink has-[:checked]:bg-brand-soft/50 has-[:checked]:ring-2 has-[:checked]:ring-brand has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40"
            >
              <input type="radio" name="orderActivity" checked={draft.orderActivity === o.value} onChange={() => set({ orderActivity: o.value })} className="peer sr-only" />
              <span aria-hidden className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-line bg-white peer-checked:border-[6px] peer-checked:border-ink" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{o.label}</span>
                <span className="block text-xs text-muted">{o.text}</span>
              </span>
            </label>
          ))}
        </div>
        {needsDays(draft.orderActivity) && (
          <DaysField label={draft.orderActivity === "LAPSED" ? "Nothing delivered in the last" : "Delivered in the last"} value={draft.activityDays} onChange={(activityDays) => set({ activityDays })} error={err("activityDays")} />
        )}
      </Group>

      <Group title="Bought from" hint="Leave empty for everyone. Picking a category includes everything under it.">
        <CategoryChooser categories={categories} value={draft.boughtCategoryIds} onChange={(boughtCategoryIds) => set({ boughtCategoryIds })} names={names} onNames={onNames} error={categoryError} />
      </Group>

      <Group title="New sign-ups">
        <Switch checked={draft.joinedOn} onChange={(joinedOn) => set({ joinedOn })} label="Only people who signed up recently" />
        {draft.joinedOn && <DaysField label="Signed up in the last" value={draft.joinedWithinDays} onChange={(joinedWithinDays) => set({ joinedWithinDays })} error={err("joinedWithinDays")} />}
      </Group>

      <p className="rounded-2xl bg-surface px-4 py-3 text-sm text-muted">People who turned offers off never get campaigns, whatever the filters.</p>
    </div>
  );
}

function LiveCount({ live }: { live: CountState }) {
  return (
    <div aria-live="polite" className="flex items-center gap-3 rounded-2xl bg-ink p-4 text-white">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand">
        {live.state === "loading" ? <LoaderCircle aria-hidden className="size-5 animate-spin" /> : <Users aria-hidden className="size-5" />}
      </span>
      <div className="min-w-0 text-sm">
        {live.state === "ready" ? (
          <>
            <p key={live.count.users} className="text-lg font-extrabold motion-safe:animate-pop-in">
              {count(live.count.users)} {live.count.users === 1 ? "person" : "people"}
            </p>
            <p className="text-white/75">
              {live.count.users === 0
                ? "Nobody matches yet. Widen the filters."
                : `${count(live.count.reachableByPush)} will get a push now, the rest see it in their inbox.`}
            </p>
          </>
        ) : live.state === "error" ? (
          <p className="text-white/85">{live.message}</p>
        ) : (
          <p className="text-white/75">Counting who matches…</p>
        )}
      </div>
    </div>
  );
}

function Group({ title, hint, error, children }: { title: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="text-sm font-bold text-ink">{title}</legend>
      {hint && <p className="-mt-1 text-sm text-muted">{hint}</p>}
      {children}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </fieldset>
  );
}

function CheckCard({ checked, onChange, label, icon }: { checked: boolean; onChange: (on: boolean) => void; label: string; icon?: ReactNode }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl px-4 ring-1 ring-line transition hover:ring-ink has-[:checked]:bg-brand-soft/50 has-[:checked]:ring-2 has-[:checked]:ring-brand has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className={`flex size-5 shrink-0 items-center justify-center rounded-md border-2 ${checked ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
        {checked && <Check className="size-3.5" strokeWidth={3} />}
      </span>
      {icon}
      <span className="text-sm font-semibold text-ink">{label}</span>
    </label>
  );
}

function DaysField({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error?: string }) {
  const id = useId();
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-ink">
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 3))}
          aria-invalid={!!error}
          className={`min-h-10 w-20 rounded-xl border bg-white px-3 text-center text-base tabular-nums outline-none focus:ring-2 focus:ring-brand/40 ${error ? "border-red-500" : "border-line focus:border-ink"}`}
        />
        <span>days</span>
      </div>
      {error && <p className="mt-1.5 text-sm text-red-700">{error}</p>}
    </div>
  );
}
