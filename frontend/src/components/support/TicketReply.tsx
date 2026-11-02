"use client";

import { Loader2, Lock, MessageSquare, SendHorizontal } from "lucide-react";
import { useId, useState } from "react";
import { SUPPORT_LIMITS, messageError } from "@/lib/support/validation";

// The reply box under a conversation. Admins can switch it to an internal note
// (only admins see those). onSend returns true when the message went out.
export function TicketReply({ onSend, allowInternal, placeholder = "Write a reply…" }: { onSend: (body: string, internal: boolean) => Promise<boolean>; allowInternal?: boolean; placeholder?: string }) {
  const id = useId();
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function send() {
    const problem = messageError(body);
    setError(problem ?? null);
    if (problem || sending) return;
    setSending(true);
    const sent = await onSend(body.trim(), internal);
    setSending(false);
    if (sent) setBody("");
  }

  return (
    <div className={`rounded-3xl p-4 ring-1 transition ${internal ? "bg-yellow-50 ring-yellow-300" : "bg-white ring-line"}`}>
      {allowInternal && (
        <div role="radiogroup" aria-label="Who sees it" className="mb-3 inline-flex gap-1 rounded-full bg-surface p-1 ring-1 ring-line">
          {[
            { value: false, label: "Reply to customer", icon: MessageSquare },
            { value: true, label: "Internal note", icon: Lock },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={internal === o.value}
              onClick={() => setInternal(o.value)}
              className={`flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition ${internal === o.value ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
            >
              <o.icon aria-hidden className="size-4" />
              {o.label}
            </button>
          ))}
        </div>
      )}
      <label htmlFor={id} className="sr-only">
        {internal ? "Internal note" : "Your message"}
      </label>
      <textarea
        id={id}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
        }}
        rows={3}
        maxLength={SUPPORT_LIMITS.message}
        placeholder={internal ? "Only admins see this note." : placeholder}
        aria-invalid={!!error}
        className={`w-full resize-y rounded-2xl border bg-white px-3 py-2.5 text-base text-ink outline-none focus:ring-2 focus:ring-brand/40 ${error ? "border-red-500" : "border-line focus:border-ink"}`}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className={`text-xs ${error ? "font-semibold text-red-700" : "text-muted"}`}>{error ?? `${body.trim().length}/${SUPPORT_LIMITS.message}`}</span>
        <button
          type="button"
          onClick={send}
          disabled={sending || !body.trim()}
          className="flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-50"
        >
          {sending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <SendHorizontal aria-hidden className="size-4" />}
          {sending ? "Sending…" : internal ? "Save note" : "Send"}
        </button>
      </div>
    </div>
  );
}
