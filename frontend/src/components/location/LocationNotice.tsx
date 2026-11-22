"use client";

import { usePathname } from "next/navigation";
import { areaName } from "@/lib/location/types";
import { openLocationPicker } from "./delivery-location";
import { isShoppingPage } from "./pages";
import { useServiceability } from "./serviceability";

// A rounded notice card at the top of the page column on shopping pages, only
// when the chosen point needs a word: every store there is closed right now
// (amber), or nobody delivers there yet (grey). Delivering = nothing here (the
// header's green dot says it). It scrolls away with the page. Rendered inside
// <Suspense> (usePathname).
export function LocationNotice() {
  const pathname = usePathname();
  const { location, result } = useServiceability();
  if (!location || !result || !isShoppingPage(pathname)) return null;
  const area = areaName(location.label);

  if (!result.serviceable) {
    return <Card tone={GREY} lead={`We're not in ${area} yet.`} rest="No store delivers to this point." action="Try another location" home={pathname === "/"} />;
  }
  if (result.openNowCount === 0) {
    return <Card tone={AMBER} lead={`Stores near ${area} are closed right now.`} rest="You can still look around." action="Change location" home={pathname === "/"} />;
  }
  return null;
}

type Tone = { box: string; dot: string; lead: string; rest: string; button: string };

// Colours from the 2026-11-07 home design.
const AMBER: Tone = {
  box: "border-[#f6dfb5] bg-[#fff4e0]",
  dot: "bg-[#d97706] shadow-[0_0_0_4px_rgb(217_119_6/0.16)]",
  lead: "text-[#5a3a06]",
  rest: "text-[#6b4a12]",
  button: "border-[#ebcf9c] text-[#5a3a06] hover:border-[#d9b475]",
};
const GREY: Tone = {
  box: "border-slate-200 bg-slate-50",
  dot: "bg-slate-400 shadow-[0_0_0_4px_rgb(148_163_184/0.2)]",
  lead: "text-slate-800",
  rest: "text-slate-600",
  button: "border-slate-300 text-slate-800 hover:border-slate-400",
};

// home: the home banner's background starts right below, so leave the design's gap; other pages have their own top spacing.
function Card({ tone, lead, rest, action, home }: { tone: Tone; lead: string; rest: string; action: string; home: boolean }) {
  return (
    <div className={`mx-auto w-full max-w-page px-4 pt-4 sm:px-6 sm:pt-5 lg:px-8 ${home ? "pb-4 sm:pb-5" : ""}`}>
      <div role="status" className={`flex flex-wrap items-center gap-3 rounded-2xl border py-2.5 pl-4 pr-2.5 ${tone.box}`}>
        <span aria-hidden className={`size-2 shrink-0 rounded-full ${tone.dot}`} />
        <p className={`min-w-[min(15rem,100%)] flex-1 text-sm text-pretty ${tone.rest}`}>
          <strong className={`font-bold ${tone.lead}`}>{lead}</strong> {rest}
        </p>
        <button type="button" onClick={() => openLocationPicker()} className={`min-h-10 shrink-0 rounded-[10px] border bg-white px-3.5 text-[13px] font-semibold transition ${tone.button}`}>
          {action}
        </button>
      </div>
    </div>
  );
}
