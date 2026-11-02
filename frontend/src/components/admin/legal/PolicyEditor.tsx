"use client";

import { AlertTriangle, Bold, Eye, Heading2, Heading3, Info, Italic, Link2, List, ListOrdered, Loader2, PencilLine, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { TextField } from "@/components/auth/AuthFields";
import { Dialog } from "@/components/Dialog";
import { PolicyMarkdown } from "@/components/legal/PolicyMarkdown";
import { Switch } from "@/components/admin/page-editor/parts";
import { toastError, toastSuccess } from "@/components/Toaster";
import { publishPolicyAction } from "@/lib/legal/admin-actions";
import { legalTabHref } from "@/lib/legal/admin-tabs";
import { POLICY_LIMITS, policyErrors, type PolicyDraft, type PolicyField } from "@/lib/legal/admin-validation";
import { POLICY_PAGES, type PolicyType } from "@/lib/legal/types";

// Publish a new version of one policy. Starts from the current text, so a fix
// is a small edit. Versions can't be edited once published.
export function PolicyEditor({ type, start, nextVersion }: { type: PolicyType; start: { title: string; content: string }; nextVersion: number }) {
  const router = useRouter();
  const { sessionExpired } = useAuth();
  const [draft, setDraft] = useState<PolicyDraft>({ title: start.title, content: start.content, changeSummary: "", requiresReacceptance: false });
  const [errors, setErrors] = useState<Partial<Record<PolicyField, string>>>({});
  const [banner, setBanner] = useState<{ text: string; reload?: boolean } | null>(null);
  const [view, setView] = useState<"write" | "preview">("write");
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const contentId = useId();
  const page = POLICY_PAGES[type];
  const refund = type === "REFUND";
  const dirty = draft.title !== start.title || draft.content !== start.content || !!draft.changeSummary || draft.requiresReacceptance;
  const unchanged = draft.content === start.content && draft.title === start.title;

  // Leaving with unsaved text asks first (the browser's own prompt).
  useEffect(() => {
    if (!dirty || pending) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending]);

  function set(patch: Partial<PolicyDraft>) {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k as PolicyField];
      return next;
    });
  }

  function check() {
    const found = policyErrors(draft);
    setErrors(found);
    if (Object.keys(found).length) {
      if (found.content) setView("write");
      toastError("Some fields need fixing.");
      return false;
    }
    return true;
  }

  function publish() {
    setBanner(null);
    startTransition(async () => {
      const res = await publishPolicyAction(type, draft);
      setConfirming(false);
      if (!res.ok) {
        if (res.error.code === "UNAUTHENTICATED") return sessionExpired();
        setErrors(res.error.fieldErrors as Partial<Record<PolicyField, string>>);
        if (res.error.code === "POLICY_PUBLISH_CONFLICT") return setBanner({ text: res.error.message, reload: true });
        toastError(res.error.message);
        return setBanner({ text: res.error.message });
      }
      toastSuccess(res.data.message || `Version ${res.data.version ?? nextVersion} published.`);
      router.push(legalTabHref(type));
    });
  }

  // ---- toolbar: wraps the selection, or starts the selected lines ----
  function edit(make: (text: string, from: number, to: number) => { text: string; from: number; to: number }) {
    const el = textRef.current;
    if (!el) return;
    const out = make(draft.content, el.selectionStart, el.selectionEnd);
    set({ content: out.text });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(out.from, out.to);
    });
  }
  const wrap = (before: string, after: string, placeholder: string) =>
    edit((t, a, b) => {
      const inner = t.slice(a, b) || placeholder;
      return { text: t.slice(0, a) + before + inner + after + t.slice(b), from: a + before.length, to: a + before.length + inner.length };
    });
  const lines = (prefix: (i: number) => string) =>
    edit((t, a, b) => {
      const start = t.lastIndexOf("\n", a - 1) + 1;
      const end = b > a && t[b - 1] === "\n" ? b - 1 : b;
      const block = t.slice(start, end).split("\n").map((l, i) => prefix(i) + l.replace(/^(#{1,6} |[-*] |\d+\. )/, "")).join("\n");
      return { text: t.slice(0, start) + block + t.slice(end), from: start, to: start + block.length };
    });

  function runTool(key: ToolKey) {
    if (key === "h2") lines(() => "## ");
    else if (key === "h3") lines(() => "### ");
    else if (key === "bold") wrap("**", "**", "bold text");
    else if (key === "italic") wrap("*", "*", "italic text");
    else if (key === "ul") lines(() => "- ");
    else if (key === "ol") lines((i) => `${i + 1}. `);
    else wrap("[", "](https://360mart.in/)", "link text");
  }

  return (
    <div className="space-y-5 pb-24 sm:pb-0">
      <p className="flex items-start gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-900 ring-1 ring-sky-200">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          This becomes <b>version {nextVersion}</b> of the {page.name}. Published versions can&apos;t be edited: a fix is a new version. Earlier versions stay readable.
        </span>
      </p>

      {banner && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
          <span>{banner.text}</span>
          {banner.reload && (
            <button type="button" onClick={() => router.refresh()} className="min-h-10 rounded-full bg-white px-4 font-semibold text-ink ring-1 ring-line hover:ring-ink">
              Reload
            </button>
          )}
        </div>
      )}

      <section className="space-y-5 rounded-3xl bg-white p-5 ring-1 ring-line sm:p-6">
        <TextField label="Title" name="title" autoComplete="off" maxLength={POLICY_LIMITS.title} value={draft.title} onChange={(title) => set({ title })} error={errors.title} hint={`${draft.title.length}/${POLICY_LIMITS.title} · the page's heading.`} />
        <TextField
          label="What changed"
          name="changeSummary"
          autoComplete="off"
          optional
          maxLength={POLICY_LIMITS.changeSummary}
          value={draft.changeSummary}
          onChange={(changeSummary) => set({ changeSummary })}
          error={errors.changeSummary}
          placeholder="We now explain how refunds for damaged items work."
          hint={`${draft.changeSummary.length}/${POLICY_LIMITS.changeSummary} · one or two plain sentences. People see it when asked to accept the new version.`}
        />
        {!refund && (
          <div className="space-y-2">
            <Switch checked={draft.requiresReacceptance} onChange={(requiresReacceptance) => set({ requiresReacceptance })} label="Ask everyone to accept this version" />
            {draft.requiresReacceptance ? (
              <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 ring-1 ring-amber-200">
                <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
                Everyone will have to accept this before their next order.
              </p>
            ) : (
              <p className="text-sm text-muted">Off: for small fixes (typos, wording). People who accepted an earlier version aren&apos;t asked again.</p>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby={`${contentId}-label`} className="rounded-3xl bg-white ring-1 ring-line">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-6">
          <h2 id={`${contentId}-label`} className="font-bold text-ink">
            Text
          </h2>
          {/* Phones and tablets switch between writing and the preview; wide screens show both. */}
          <div className="inline-flex gap-1 rounded-2xl bg-surface p-1 ring-1 ring-line lg:hidden" role="tablist" aria-label="Text view">
            <Tab active={view === "write"} onClick={() => setView("write")} icon={<PencilLine aria-hidden className="size-4" />} label="Write" />
            <Tab active={view === "preview"} onClick={() => setView("preview")} icon={<Eye aria-hidden className="size-4" />} label="Preview" />
          </div>
        </div>
        <div className="grid lg:grid-cols-2">
          <div className={`min-w-0 border-line p-4 sm:p-6 lg:block lg:border-r ${view === "write" ? "block" : "hidden"}`}>
            <div className="mb-2 flex flex-wrap gap-1" role="toolbar" aria-label="Formatting">
              {TOOLS.map((t) => (
                <button key={t.key} type="button" onClick={() => runTool(t.key)} title={t.label} aria-label={t.label} className="flex size-10 items-center justify-center rounded-xl text-ink ring-1 ring-line transition hover:bg-surface hover:ring-ink">
                  <t.icon aria-hidden className="size-4" />
                </button>
              ))}
            </div>
            <label htmlFor={contentId} className="sr-only">
              Policy text (Markdown)
            </label>
            <textarea
              ref={textRef}
              id={contentId}
              value={draft.content}
              onChange={(e) => set({ content: e.target.value })}
              aria-invalid={!!errors.content}
              aria-describedby={`${contentId}-hint`}
              spellCheck
              className={`min-h-[28rem] w-full resize-y rounded-2xl border bg-white px-4 py-3 font-mono text-sm leading-6 text-ink outline-none focus:ring-2 focus:ring-brand/40 ${errors.content ? "border-red-500" : "border-line focus:border-ink"}`}
              placeholder={"## 1. About these terms\n\nWrite the policy here. Headings start with ##, lists with - ."}
            />
            {errors.content && <p className="mt-1.5 text-sm text-red-700">{errors.content}</p>}
            <p id={`${contentId}-hint`} className="mt-1.5 flex flex-wrap justify-between gap-2 text-xs text-muted">
              <span>Markdown: ## heading, **bold**, *italic*, - list, [text](link). HTML isn&apos;t shown.</span>
              <span className={`tabular-nums ${draft.content.length > POLICY_LIMITS.content ? "font-semibold text-red-700" : ""}`}>
                {draft.content.length.toLocaleString("en-IN")} / {POLICY_LIMITS.content.toLocaleString("en-IN")}
              </span>
            </p>
          </div>
          <div className={`min-w-0 p-4 sm:p-6 lg:block ${view === "preview" ? "block" : "hidden"}`}>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">Preview</p>
            <h3 className="text-2xl font-extrabold tracking-tight text-ink">{draft.title || "Untitled"}</h3>
            <div className="mt-4 max-h-[36rem] overflow-y-auto pr-1">{draft.content.trim() ? <PolicyMarkdown content={draft.content} /> : <p className="text-sm text-muted">Nothing to show yet.</p>}</div>
          </div>
        </div>
      </section>

      {/* Sticky on phones so Publish is always in reach. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:static sm:rounded-3xl sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-2">
          <Link href={legalTabHref(type)} className="flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-muted hover:text-ink">
            Cancel
          </Link>
          <button
            type="button"
            onClick={() => check() && setConfirming(true)}
            disabled={pending}
            className="flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-60"
          >
            <Send aria-hidden className="size-4" />
            Publish version {nextVersion}
          </button>
        </div>
      </div>

      <Dialog open={confirming} onClose={() => !pending && setConfirming(false)} title={`Publish version ${nextVersion}?`} description={`It replaces the current ${page.name} on ${page.path} straight away.`}>
        <div className="space-y-4 pb-5">
          <ul className="space-y-2 text-sm text-ink/85">
            <li>
              <b className="text-ink">Title:</b> {draft.title.trim()}
            </li>
            {draft.changeSummary.trim() && (
              <li>
                <b className="text-ink">What changed:</b> {draft.changeSummary.trim()}
              </li>
            )}
          </ul>
          {unchanged && <p className="rounded-xl bg-surface px-3 py-2 text-sm text-ink/85">The title and text are the same as the current version.</p>}
          {draft.requiresReacceptance && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 ring-1 ring-amber-200">
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
              Everyone will have to accept this before their next order.
            </p>
          )}
          <p className="text-sm text-muted">Published versions can&apos;t be edited or removed.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setConfirming(false)} disabled={pending} className="min-h-11 rounded-full px-4 text-sm font-semibold text-muted hover:text-ink">
              Not yet
            </button>
            <button type="button" onClick={publish} disabled={pending} className="flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-60">
              {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Send aria-hidden className="size-4" />}
              {pending ? "Publishing…" : "Publish"}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

type ToolKey = "h2" | "h3" | "bold" | "italic" | "ul" | "ol" | "link";
const TOOLS: { key: ToolKey; label: string; icon: typeof Bold }[] = [
  { key: "h2", label: "Heading", icon: Heading2 },
  { key: "h3", label: "Subheading", icon: Heading3 },
  { key: "bold", label: "Bold", icon: Bold },
  { key: "italic", label: "Italic", icon: Italic },
  { key: "ul", label: "Bulleted list", icon: List },
  { key: "ol", label: "Numbered list", icon: ListOrdered },
  { key: "link", label: "Link", icon: Link2 },
];

function Tab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition ${active ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
      {icon}
      {label}
    </button>
  );
}
