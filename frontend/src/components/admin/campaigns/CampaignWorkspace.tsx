"use client";

import { Ban, CalendarClock, Copy, Pencil, RefreshCw, Save, Send, Smartphone, Trash2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { ActionButton, Panel } from "@/components/admin/page-editor/shell";
import { useAuth } from "@/components/auth/AuthProvider";
import { Dialog } from "@/components/Dialog";
import { toastError, toastSuccess } from "@/components/Toaster";
import type { ActionError } from "@/lib/auth/actions";
import { campaignStep, createCampaign, deleteCampaign, loadCampaign, previewAudience, scheduleCampaign, updateCampaign, uploadCampaignImage } from "@/lib/campaigns/admin-client";
import { STATUS_META } from "@/lib/campaigns/format";
import { DEFAULT_TIMER_LABEL, TIMER_COLOURS, type AudienceCount, type Campaign, type CampaignAction } from "@/lib/campaigns/types";
import { audienceErrors, audienceFromDraft, campaignErrors, draftFromCampaign, EMPTY_DRAFT, inputFromDraft, type CampaignDraft } from "@/lib/campaigns/validation";
import { when } from "@/lib/orders/format";
import { AudienceBuilder, type CountState } from "./AudienceBuilder";
import { audienceLines, CampaignResults } from "./CampaignResults";
import type { CategoryOption } from "./CategoryChooser";
import { MessageFields } from "./MessageFields";
import { PhonePreview } from "./PhonePreview";
import { ScheduleDialog } from "./ScheduleDialog";

type Busy = null | "save" | "test" | "schedule" | "unschedule" | "cancel" | "duplicate" | "delete" | "reload";
const POLL_MS = 5_000;

// One campaign, from first draft to results (like an AngularJS controller
// owning the page's state). A draft, or a scheduled one being edited, shows
// the editor; otherwise the results. Buttons come only from allowedActions.
// Every write is followed by one GET (loadCampaign).
export function CampaignWorkspace({ initial, categories }: { initial: Campaign | null; categories: CategoryOption[] }) {
  const router = useRouter();
  const { sessionExpired } = useAuth();
  const [campaign, setCampaign] = useState(initial);
  const [draft, setDraft] = useState<CampaignDraft>(() => (initial ? draftFromCampaign(initial) : EMPTY_DRAFT));
  const [saved, setSaved] = useState(() => JSON.stringify(inputFromDraft(initial ? draftFromCampaign(initial) : EMPTY_DRAFT)));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Busy>(null);
  const [editing, setEditing] = useState(false);
  const [localImage, setLocalImage] = useState<{ imageId: string; url: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [names, setNames] = useState<Record<number, string>>(() => Object.fromEntries(categories.map((c) => [c.id, c.name])));
  const [sendOpen, setSendOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | "cancel" | "delete">(null);

  const id = campaign?.campaignId ?? null;
  const allowed = (a: CampaignAction) => !campaign || campaign.allowedActions.includes(a);
  const showEditor = !campaign || campaign.status === "DRAFT" || (editing && allowed("EDIT"));
  const input = inputFromDraft(draft);
  const dirty = JSON.stringify(input) !== saved;
  const imageUrl = draft.imageId ? (localImage?.imageId === draft.imageId ? localImage.url : campaign?.imageId === draft.imageId ? campaign.imageUrl : null) : null;

  // A newer copy from the server (a later visit: visited pages stay alive; or
  // the refresh after a save) is taken in here, unless there are unsaved
  // edits. Not by remounting: that would also drop an open dialog, like the
  // send dialog opened right after "Send or schedule" saved the changes.
  // Compared as timestamps: the API's precision differs after a save.
  const serverVersion = initial ? Date.parse(initial.updatedAt ?? initial.createdAt) : 0;
  const [seenVersion, setSeenVersion] = useState(serverVersion);
  if (initial && serverVersion !== seenVersion) {
    setSeenVersion(serverVersion);
    const mine = campaign ? Date.parse(campaign.updatedAt ?? campaign.createdAt) : 0;
    if (!dirty && serverVersion > mine) take(initial);
  }

  const set = (patch: Partial<CampaignDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    // A changed field's error goes; the rest stay until the next save.
    setErrors((e) => {
      const keys = Object.keys(patch);
      const next = Object.fromEntries(Object.entries(e).filter(([k]) => !keys.some((p) => k === p || k.startsWith(`audience.${p}`) || (p === "orderActivity" && k === "audience.activityDays") || (p === "joinedOn" && k === "audience.joinedWithinDays"))));
      return Object.keys(next).length === Object.keys(e).length ? e : next;
    });
  };

  function take(c: Campaign) {
    setCampaign(c);
    const d = draftFromCampaign(c);
    setDraft(d);
    setSaved(JSON.stringify(inputFromDraft(d)));
  }

  async function reload(campaignId = id): Promise<Campaign | null> {
    if (!campaignId) return null;
    const res = await loadCampaign(campaignId);
    if (res.ok) {
      take(res.data);
      return res.data;
    }
    failed(res.error, false);
    return null;
  }

  function failed(error: ActionError, reloadOnConflict = true) {
    if (error.code === "UNAUTHENTICATED") return sessionExpired();
    if (error.code === "CAMPAIGN_NOT_FOUND") {
      toastError("This campaign was deleted.");
      return router.push("/admin/campaigns");
    }
    // A problem with one field (e.g. the countdown's end time on "Send test"): its own words, marked on the field.
    const fields = Object.entries(error.fieldErrors ?? {});
    if (fields.length) {
      showErrors(error.fieldErrors);
      toastError(fields[0][1]);
    } else toastError(error.message);
    if (error.code === "CAMPAIGN_STATE_CONFLICT" && reloadOnConflict) {
      setEditing(false);
      void reload();
    }
  }

  function showErrors(fieldErrors: Record<string, string>) {
    setErrors(fieldErrors);
    // After the errors render: bring the first one into view.
    setTimeout(() => {
      const first = document.querySelector<HTMLElement>('[aria-invalid="true"]');
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      first?.focus({ preventScroll: true });
    }, 0);
  }

  /** Saves when needed; answers the campaign's id (null = it couldn't be saved). */
  async function save(): Promise<string | null> {
    if (id && !dirty) return id;
    const problems = campaignErrors(input);
    if (Object.keys(problems).length) {
      showErrors(problems);
      toastError("Please fix the highlighted fields.");
      return null;
    }
    const res = id ? await updateCampaign(id, input) : await createCampaign(input);
    if (!res.ok) {
      if (Object.keys(res.error.fieldErrors).length) showErrors(res.error.fieldErrors);
      failed(res.error);
      return null;
    }
    setErrors({});
    toastSuccess(res.data.message);
    const savedId = id ?? res.data.id ?? null;
    if (!savedId) return null;
    const fresh = await reload(savedId);
    // A new campaign now has its own address; the page stays as it is.
    if (!id && fresh) window.history.replaceState(null, "", `/admin/campaigns/${savedId}`);
    return savedId;
  }

  async function run(kind: Busy, work: () => Promise<void>) {
    if (busy) return;
    setBusy(kind);
    try {
      await work();
    } finally {
      setBusy(null);
    }
  }

  const onSave = () => run("save", async () => void (await save()));

  const onTest = () =>
    run("test", async () => {
      const savedId = await save();
      if (!savedId) return;
      const res = await campaignStep(savedId, "test");
      if (res.ok) toastSuccess(res.data.message);
      else if (res.error.code === "NO_TEST_DEVICE") toastError(`${res.error.message} Log in to the 360mart app on your phone with this admin account, then try again.`);
      else failed(res.error);
    });

  const onOpenSend = () =>
    run("schedule", async () => {
      if (await save()) setSendOpen(true);
    });

  async function onConfirmSend(sendAt: string | null) {
    if (!id) return null;
    const res = await scheduleCampaign(id, sendAt, campaign?.expiresAt ?? null, !!campaign?.timerStyle && campaign.timerStyle !== "NONE");
    if (res.ok) {
      toastSuccess(res.data.message);
      setSendOpen(false);
      setEditing(false);
      await reload();
      return null;
    }
    if (res.error.code === "UNAUTHENTICATED") {
      sessionExpired();
      return null;
    }
    if (res.error.code === "CAMPAIGN_STATE_CONFLICT") {
      setSendOpen(false);
      failed(res.error);
      return null;
    }
    return { fieldErrors: res.error.fieldErrors, message: Object.keys(res.error.fieldErrors).length ? "" : res.error.message };
  }

  const onStep = (step: "unschedule" | "cancel" | "duplicate") =>
    run(step, async () => {
      if (!id) return;
      const res = await campaignStep(id, step);
      setConfirm(null);
      if (!res.ok) return failed(res.error);
      toastSuccess(res.data.message);
      if (step === "duplicate" && res.data.id) return router.push(`/admin/campaigns/${res.data.id}`);
      setEditing(false);
      await reload();
    });

  const onDelete = () =>
    run("delete", async () => {
      if (!id) return;
      const res = await deleteCampaign(id);
      setConfirm(null);
      if (!res.ok) return failed(res.error);
      toastSuccess(res.data.message);
      setSaved(JSON.stringify(input)); // nothing left to lose
      router.push("/admin/campaigns");
    });

  async function onUpload(file: File) {
    setUploading(true);
    const reader = new FileReader();
    const preview = new Promise<string>((resolve) => {
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.readAsDataURL(file);
    });
    const form = new FormData();
    form.append("image", file);
    const [res, url] = await Promise.all([uploadCampaignImage(form), preview]);
    setUploading(false);
    if (!res.ok) {
      if (res.error.code === "UNAUTHENTICATED") return sessionExpired();
      setErrors((e) => ({ ...e, imageId: res.error.message }));
      return;
    }
    setLocalImage({ imageId: res.data.imageId, url });
    set({ imageId: res.data.imageId });
  }

  // ---- live audience count (500 ms after the last change; newest answer wins) ----

  const audienceJson = JSON.stringify(audienceFromDraft(draft));
  const audienceProblem = Object.keys(audienceErrors(audienceFromDraft(draft))).length > 0;
  const [counted, setCounted] = useState<{ key: string; result: { ok: true; count: AudienceCount } | { ok: false; message: string } } | null>(null);
  const countSeq = useRef(0);
  const counting = allowed("EDIT") || allowed("SCHEDULE");

  useEffect(() => {
    if (!counting || audienceProblem) return;
    const seq = ++countSeq.current;
    const timer = setTimeout(async () => {
      const res = await previewAudience(JSON.parse(audienceJson));
      if (seq !== countSeq.current) return;
      if (!res.ok && res.error.code === "UNAUTHENTICATED") return sessionExpired();
      setCounted({ key: audienceJson, result: res.ok ? { ok: true, count: res.data } : { ok: false, message: res.error.message } });
    }, 500);
    return () => clearTimeout(timer);
  }, [audienceJson, audienceProblem, counting, sessionExpired]);

  const live: CountState = audienceProblem
    ? { state: "error", message: "Fix the highlighted audience fields to see how many people it reaches." }
    : counted?.key !== audienceJson
      ? { state: "loading" }
      : counted.result.ok
        ? { state: "ready", count: counted.result.count }
        : { state: "error", message: counted.result.message };

  // ---- results refresh: every 5 s while sending; a scheduled one is re-read when its time comes ----

  const status = campaign?.status;
  const sendAt = campaign?.sendAt;
  useEffect(() => {
    if (!id || showEditor || (status !== "SENDING" && status !== "SCHEDULED")) return;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void loadCampaign(id).then((res) => {
        if (res.ok) take(res.data);
      });
    };
    if (status === "SENDING") {
      const timer = setInterval(tick, POLL_MS);
      return () => clearInterval(timer);
    }
    const due = sendAt ? Date.parse(sendAt) - Date.now() : 0;
    const timer = setTimeout(tick, Math.min(Math.max(due, 0) + POLL_MS, 2 ** 31 - 1));
    return () => clearTimeout(timer);
    // updatedAt / pending re-arm the timer after each read.
  }, [id, showEditor, status, sendAt, campaign?.updatedAt, campaign?.stats?.pending]);

  // Unsaved changes: ask before the tab closes.
  useEffect(() => {
    if (!dirty || !showEditor) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, showEditor]);

  // ---- layout ----

  const meta = campaign ? STATUS_META[campaign.status] : null;
  const title = (showEditor ? draft.name.trim() : campaign?.name) || "New campaign";
  const preview = <PhonePreview title={draft.title} body={draft.body} imageUrl={imageUrl} link={draft.link.trim()} expiresAt={input.expiresAt} timer={{ style: input.timerStyle, label: input.timerLabel, theme: input.timerTheme }} />;

  const actionBar = (
    <div className={showEditor ? "sticky bottom-0 z-10 -mx-4 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-3xl sm:border sm:p-4" : "rounded-3xl border border-line bg-white p-3 sm:p-4"}>
      <div className="flex flex-wrap items-center gap-2">
        {showEditor ? (
          <>
            {campaign?.status === "DRAFT" && allowed("DELETE") && (
              <button type="button" onClick={() => setConfirm("delete")} disabled={!!busy} className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
                <Trash2 aria-hidden className="size-4" />
                <span className="hidden sm:inline">Delete draft</span>
                <span className="sr-only sm:hidden">Delete draft</span>
              </button>
            )}
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  if (campaign) take(campaign);
                  setErrors({});
                }}
                disabled={!!busy}
                className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted hover:text-ink disabled:opacity-50"
              >
                <Undo2 aria-hidden className="size-4" />
                {dirty ? "Discard changes" : "Done"}
              </button>
            )}
            <div className="ml-auto flex w-full flex-wrap gap-2 sm:w-auto">
              {allowed("TEST") && <ActionButton onClick={onTest} busy={busy === "test"} disabled={!!busy || uploading} icon={<Smartphone aria-hidden className="size-4" />} label="Send test to my phone" shortLabel="Test" />}
              {allowed("EDIT") && <ActionButton onClick={onSave} busy={busy === "save"} disabled={!!busy || uploading || (!!id && !dirty)} icon={<Save aria-hidden className="size-4" />} label={id ? (dirty ? "Save changes" : "Saved") : "Save draft"} shortLabel={id && !dirty ? "Saved" : "Save"} />}
              {allowed("SCHEDULE") && <ActionButton primary onClick={onOpenSend} busy={busy === "schedule"} disabled={!!busy || uploading} icon={<Send aria-hidden className="size-4" />} label={campaign?.status === "SCHEDULED" ? "Change time" : "Send or schedule"} shortLabel={campaign?.status === "SCHEDULED" ? "Time" : "Send"} />}
            </div>
          </>
        ) : (
          <div className="flex w-full flex-wrap justify-end gap-2">
            <ActionButton onClick={() => run("reload", async () => void (await reload()))} busy={busy === "reload"} disabled={!!busy} icon={<RefreshCw aria-hidden className="size-4" />} label="Refresh" />
            {allowed("EDIT") && <ActionButton onClick={() => setEditing(true)} busy={false} disabled={!!busy} icon={<Pencil aria-hidden className="size-4" />} label="Edit" />}
            {allowed("TEST") && <ActionButton onClick={onTest} busy={busy === "test"} disabled={!!busy} icon={<Smartphone aria-hidden className="size-4" />} label="Send test to my phone" shortLabel="Test" />}
            {allowed("SCHEDULE") && <ActionButton onClick={() => setSendOpen(true)} busy={false} disabled={!!busy} icon={<CalendarClock aria-hidden className="size-4" />} label="Change time" />}
            {allowed("UNSCHEDULE") && <ActionButton onClick={() => onStep("unschedule")} busy={busy === "unschedule"} disabled={!!busy} icon={<Undo2 aria-hidden className="size-4" />} label="Back to draft" />}
            {allowed("CANCEL") && <ActionButton onClick={() => setConfirm("cancel")} busy={busy === "cancel"} disabled={!!busy} icon={<Ban aria-hidden className="size-4" />} label={campaign?.status === "SENDING" ? "Stop sending" : "Cancel"} />}
            {allowed("DUPLICATE") && <ActionButton primary onClick={() => onStep("duplicate")} busy={busy === "duplicate"} disabled={!!busy} icon={<Copy aria-hidden className="size-4" />} label="Send again (copy)" shortLabel="Copy" />}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-4">
      <AdminPageHeader
        title={title}
        crumbs={[{ name: "Campaigns", href: "/admin/campaigns" }]}
        subtitle={
          campaign
            ? `Created ${when(campaign.createdAt)}${campaign.updatedAt && campaign.updatedAt !== campaign.createdAt ? ` · last changed ${when(campaign.updatedAt)}` : ""}`
            : "Write the message, pick who gets it, check the preview, then send a test to your phone."
        }
        action={
          meta && (
            <span className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-bold ${meta.tone}`}>
              {campaign?.status === "SENDING" && <span aria-hidden className="size-2 rounded-full bg-amber-500 motion-safe:animate-pulse" />}
              {meta.label}
              {dirty && showEditor && <span className="font-semibold opacity-75">· unsaved changes</span>}
            </span>
          )
        }
      />

      {!showEditor && actionBar}

      {showEditor ? (
        <>
          {campaign?.status === "SCHEDULED" && (
            <p className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-900 ring-1 ring-sky-200">
              Scheduled for {when(campaign.sendAt)} (India time). Saving keeps that time; use &quot;Send or schedule&quot; to change it.
            </p>
          )}
          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-6">
              <Panel title="Message" text="What people see on their phone and in their inbox.">
                <MessageFields
                  draft={draft}
                  set={set}
                  errors={errors}
                  imageUrl={imageUrl}
                  uploading={uploading}
                  onUpload={onUpload}
                  onRemoveImage={() => set({ imageId: null })}
                  categories={categories}
                />
              </Panel>
              <div className="lg:hidden">{preview}</div>
              <Panel title="Audience" text="Who gets it. Every filter you use must match.">
                <AudienceBuilder draft={draft} set={set} errors={errors} categories={categories} names={names} onNames={(more) => setNames((n) => ({ ...n, ...more }))} live={live} />
              </Panel>
            </div>
            <aside className="sticky top-24 hidden lg:block">{preview}</aside>
          </div>
        </>
      ) : (
        campaign && (
          <>
            <CampaignResults campaign={campaign} />
            <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <Panel title="What was sent" text={campaign.status === "SCHEDULED" ? "What will go out." : "The message and who it was for."}>
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  <Fact label="Title">{campaign.title}</Fact>
                  <Fact label="Opens">{campaign.link ?? "The inbox"}</Fact>
                  <Fact label="Message" wide>
                    <span className="whitespace-pre-line">{campaign.body}</span>
                  </Fact>
                  <Fact label="Offer ends">{campaign.expiresAt ? `${when(campaign.expiresAt)} (India time)` : "No end"}</Fact>
                  {campaign.timerStyle && campaign.timerStyle !== "NONE" && (
                    <Fact label="Countdown">
                      {campaign.timerStyle === "BANNER" ? "Banner" : "Simple clock"}
                      {campaign.timerTheme ? ` · ${TIMER_COLOURS[campaign.timerTheme]?.name ?? campaign.timerTheme}` : ""} · &ldquo;{campaign.timerLabel || DEFAULT_TIMER_LABEL}&rdquo;
                    </Fact>
                  )}
                  <Fact label={campaign.status === "SCHEDULED" ? "Goes out" : "Sent"}>{campaign.sendAt ? `${when(campaign.sendAt)} (India time)` : "Not yet"}</Fact>
                  <Fact label="Audience" wide>
                    <ul className="list-inside list-disc space-y-0.5">
                      {audienceLines(campaign.audience, names).map((l) => (
                        <li key={l}>{l}</li>
                      ))}
                    </ul>
                  </Fact>
                </dl>
              </Panel>
              <aside className="lg:sticky lg:top-24">{preview}</aside>
            </div>
          </>
        )
      )}

      {showEditor && actionBar}

      <ScheduleDialog open={sendOpen} onClose={() => setSendOpen(false)} audience={live.state === "ready" ? live.count : null} expiresAt={campaign?.expiresAt ?? null} timer={!!campaign?.timerStyle && campaign.timerStyle !== "NONE"} currentSendAt={campaign?.status === "SCHEDULED" ? campaign.sendAt : null} onConfirm={onConfirmSend} />

      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === "delete" ? "Delete this draft?" : campaign?.status === "SENDING" ? "Stop sending?" : "Cancel this campaign?"}
        description={confirm === "delete" ? "It's gone for good. This can't be undone." : campaign?.status === "SENDING" ? "Nobody else gets it. People who already got it keep it." : "It won't go out. You can copy it later to send again."}
      >
        <div className="flex flex-col-reverse gap-2 pb-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setConfirm(null)} className="flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
            Keep it
          </button>
          <button
            type="button"
            onClick={confirm === "delete" ? onDelete : () => onStep("cancel")}
            disabled={!!busy}
            className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {confirm === "delete" ? <Trash2 aria-hidden className="size-4" /> : <Ban aria-hidden className="size-4" />}
            {confirm === "delete" ? "Delete draft" : campaign?.status === "SENDING" ? "Stop sending" : "Cancel campaign"}
          </button>
        </div>
      </Dialog>
    </div>
  );
}

function Fact({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-ink">{children}</dd>
    </div>
  );
}
