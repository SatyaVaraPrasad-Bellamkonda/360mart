"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** "wide" = a big panel (previews) on larger screens. */
  size?: "normal" | "wide";
  children: ReactNode;
};

// A modal on the browser's own <dialog> (showModal): it keeps focus inside,
// closes on Esc, and dims the page. Phones get a sheet from the bottom; larger
// screens a centred card. A tap on the dimmed area closes it too.
export function Dialog({ open, onClose, title, description, size = "normal", children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // The <dialog> itself is only hit outside the panel (the backdrop).
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-3xl bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/50 backdrop:backdrop-blur-sm sm:m-auto sm:rounded-3xl ${size === "wide" ? "sm:max-w-6xl" : "sm:max-w-2xl"}`}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-bold text-ink">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 flex size-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink">
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 pt-4 sm:pb-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}
