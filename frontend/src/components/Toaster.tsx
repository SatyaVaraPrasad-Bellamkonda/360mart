"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";
import { useEffect, useRef, useSyncExternalStore } from "react";

// Short "Saved" / "Couldn't save" messages after an action. Call
// toastSuccess() / toastError() from any client component; <Toaster> (in the
// root layout) shows them. Like an AngularJS service shared by every
// controller, it is a module-level list that the Toaster subscribes to.

type Toast = { id: number; kind: "success" | "error"; text: string };

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const EMPTY: Toast[] = [];

function emit() {
  for (const listener of listeners) listener();
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function push(kind: Toast["kind"], text: string) {
  const id = nextId++;
  // A success means earlier errors are dealt with; a repeated message replaces itself.
  const kept = toasts.filter((t) => !(kind === "success" && t.kind === "error") && t.text !== text);
  // Newest last; at most 3 on screen.
  toasts = [...kept, { id, kind, text }].slice(-3);
  emit();
  // Errors stay a little longer: there's more to read and something to do.
  setTimeout(() => dismiss(id), kind === "error" ? 8000 : 4500);
}

export const toastSuccess = (text: string) => push("success", text);
export const toastError = (text: string) => push("error", text);

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => toasts, () => EMPTY);
  const ref = useRef<HTMLDivElement>(null);

  // A popover sits in the browser's top layer, so toasts also show above an
  // open dialog. Re-showing it on each change keeps it above a dialog opened later.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof el.showPopover !== "function") return;
    if (el.matches(":popover-open")) el.hidePopover();
    if (list.length) el.showPopover();
  }, [list]);

  return (
    <div
      ref={ref}
      popover="manual"
      // Phones: across the top. Larger screens: bottom right.
      className="pointer-events-none fixed inset-x-4 top-4 bottom-auto m-0 h-auto w-auto overflow-visible border-0 bg-transparent p-0 sm:inset-x-auto sm:top-auto sm:right-6 sm:bottom-6 sm:w-96 [&:not(:popover-open)]:hidden"
    >
      {/* Two live regions, so errors are announced at once and successes politely. */}
      <div role="alert" className="space-y-2">
        {list.filter((t) => t.kind === "error").map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </div>
      <div role="status" className="mt-2 space-y-2 empty:mt-0">
        {list.filter((t) => t.kind === "success").map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </div>
    </div>
  );
}

function ToastCard({ toast }: { toast: Toast }) {
  const error = toast.kind === "error";
  const Icon = error ? CircleAlert : CircleCheck;
  return (
    <div className={`pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl ring-1 motion-safe:animate-fade-up ${error ? "bg-red-50 text-red-800 ring-red-200" : "bg-ink text-white ring-ink"}`}>
      <Icon aria-hidden className={`mt-0.5 size-5 shrink-0 ${error ? "text-red-600" : "text-green-400"}`} />
      <p className="min-w-0 flex-1 break-words">{toast.text}</p>
      <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss" className="-my-1.5 -mr-2 flex size-8 shrink-0 items-center justify-center rounded-full opacity-70 hover:opacity-100">
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}
