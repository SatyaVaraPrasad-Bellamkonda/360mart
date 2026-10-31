"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

// A row that scrolls sideways: swipe on phones, arrow buttons on computers
// (shown only when there's more to see that way).
export function RowScroller({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const list = ref.current;
    if (!list) return;
    const update = () => setEdges({ start: list.scrollLeft <= 4, end: list.scrollLeft + list.clientWidth >= list.scrollWidth - 4 });
    update();
    list.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(list);
    return () => {
      list.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  const go = (by: -1 | 1) => ref.current?.scrollBy({ left: by * ref.current.clientWidth * 0.85, behavior: "smooth" });
  const arrow = "absolute top-[38%] z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink shadow-lg ring-1 ring-line transition hover:scale-105 hover:ring-ink lg:flex";

  return (
    <div className="relative">
      <ul ref={ref} aria-label={label} className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] sm:gap-4 lg:mx-0 lg:scroll-px-0 lg:px-0">
        {children}
      </ul>
      {!edges.start && (
        <button type="button" onClick={() => go(-1)} aria-label="Scroll back" className={`${arrow} -left-5`}>
          <ChevronLeft aria-hidden className="size-5" />
        </button>
      )}
      {!edges.end && (
        <button type="button" onClick={() => go(1)} aria-label="Scroll forward" className={`${arrow} -right-5`}>
          <ChevronRight aria-hidden className="size-5" />
        </button>
      )}
    </div>
  );
}
