import { AUDIENCE_ROLES, DEFAULT_TIMER_LABEL, ORDER_ACTIVITIES, PLATFORMS, TIMER_STYLES, TIMER_THEMES, type AudienceRole, type Campaign, type CampaignAudience, type CampaignInput, type OrderActivity, type Platform, type TimerStyle, type TimerTheme } from "./types";

// The campaign editor's form model and the backend's rules (SaveCampaignRequest,
// CampaignAudience, CampaignRules), checked in the browser for quick feedback
// and again in the server action. The backend checks everything once more.
// Safe for client components.

export const LIMITS = { name: 80, title: 65, body: 240, link: 300, timerLabel: 30, cities: 20, pincodes: 50, categories: 20, days: 365 } as const;

/** With a countdown, the offer must end at most this long after sending. */
export const MAX_TIMER_HOURS = 24;

/** Minutes an offer must outlive "now" (or the send time). */
export const MIN_OFFER_MINUTES = 15;
/** Promotions can't go out between 21:00 and 09:00 India time. */
export const QUIET_START = 21;
export const QUIET_END = 9;
export const MAX_SCHEDULE_DAYS = 60;

// Same patterns as the backend's ValidationPatterns.
const SAFE_LINE = /^[^\p{Cc}<>]*$/u;
const SAFE_MULTILINE = /^[^\x00-\x09\x0B-\x1F\x7F<>]*$/;
/** A 360mart path: /fruits, /search?q=mango, /#offers. Never another site. */
export const APP_LINK = /^(?!.*\/\/)\/([a-z0-9][a-z0-9/_-]{0,199})?(\?[A-Za-z0-9=&%._+-]{1,200})?(#[a-z0-9-]{1,40})?$/;
export const PINCODE = /^[1-9][0-9]{5}$/;

/** What the form edits: text inputs stay strings until saved. */
export type CampaignDraft = {
  name: string;
  title: string;
  body: string;
  imageId: string | null;
  link: string;
  /** "YYYY-MM-DDTHH:mm" India time, or "". */
  expiresAt: string;
  timerStyle: TimerStyle;
  /** "" = the standard "Offer ends in". */
  timerLabel: string;
  timerTheme: TimerTheme;
  roles: AudienceRole[];
  platforms: Platform[];
  cities: string[];
  pincodes: string[];
  orderActivity: OrderActivity;
  activityDays: string;
  boughtCategoryIds: number[];
  joinedOn: boolean;
  joinedWithinDays: string;
};

export const EMPTY_DRAFT: CampaignDraft = {
  name: "",
  title: "",
  body: "",
  imageId: null,
  link: "",
  expiresAt: "",
  timerStyle: "NONE",
  timerLabel: "",
  timerTheme: "GOLD",
  roles: [...AUDIENCE_ROLES],
  platforms: [],
  cities: [],
  pincodes: [],
  orderActivity: "ANY",
  activityDays: "30",
  boughtCategoryIds: [],
  joinedOn: false,
  joinedWithinDays: "7",
};

export const needsDays = (a: OrderActivity) => a === "ORDERED_RECENTLY" || a === "LAPSED";

export function draftFromCampaign(c: Campaign): CampaignDraft {
  const a = c.audience ?? {};
  const activity = a.orderActivity && ORDER_ACTIVITIES.includes(a.orderActivity) ? a.orderActivity : "ANY";
  return {
    name: c.name ?? "",
    title: c.title ?? "",
    body: c.body ?? "",
    imageId: c.imageId ?? null,
    link: c.link ?? "",
    expiresAt: c.expiresAt ? istInput(c.expiresAt) : "",
    timerStyle: c.timerStyle && TIMER_STYLES.includes(c.timerStyle) ? c.timerStyle : "NONE",
    timerLabel: c.timerLabel && c.timerLabel !== DEFAULT_TIMER_LABEL ? c.timerLabel : "",
    timerTheme: c.timerTheme && TIMER_THEMES.includes(c.timerTheme) ? c.timerTheme : "GOLD",
    roles: a.roles?.length ? a.roles.filter((r) => AUDIENCE_ROLES.includes(r)) : [...AUDIENCE_ROLES],
    platforms: (a.platforms ?? []).filter((p) => PLATFORMS.includes(p)),
    cities: a.cities ?? [],
    pincodes: a.pincodes ?? [],
    orderActivity: activity,
    activityDays: a.activityDays ? String(a.activityDays) : "30",
    boughtCategoryIds: a.boughtCategoryIds ?? [],
    joinedOn: !!a.joinedWithinDays,
    joinedWithinDays: a.joinedWithinDays ? String(a.joinedWithinDays) : "7",
  };
}

const wholeNumber = (v: string) => (/^\d{1,3}$/.test(v.trim()) ? Number(v.trim()) : NaN);

/** The audience object as the backend takes it (empty filters left out). */
export function audienceFromDraft(d: CampaignDraft): CampaignAudience {
  const out: CampaignAudience = { roles: d.roles, orderActivity: d.orderActivity };
  if (d.platforms.length) out.platforms = d.platforms;
  if (d.cities.length) out.cities = d.cities;
  if (d.pincodes.length) out.pincodes = d.pincodes;
  if (needsDays(d.orderActivity)) out.activityDays = wholeNumber(d.activityDays);
  if (d.boughtCategoryIds.length) out.boughtCategoryIds = d.boughtCategoryIds;
  if (d.joinedOn) out.joinedWithinDays = wholeNumber(d.joinedWithinDays);
  return out;
}

export function inputFromDraft(d: CampaignDraft): CampaignInput {
  return {
    name: d.name.trim(),
    title: d.title.trim(),
    body: d.body.trim(),
    imageId: d.imageId,
    link: d.link.trim() || null,
    expiresAt: d.expiresAt ? isoFromIstInput(d.expiresAt) : null,
    // No timer = no label or theme (the backend stores them as null then).
    timerStyle: d.timerStyle,
    timerLabel: d.timerStyle === "NONE" ? null : d.timerLabel.trim() || null,
    timerTheme: d.timerStyle === "NONE" ? null : d.timerTheme,
    audience: audienceFromDraft(d),
  };
}

/** Problems with the audience, keyed like the backend (prefix "audience." on save, none on the live count). */
export function audienceErrors(a: CampaignAudience, prefix = ""): Record<string, string> {
  const e: Record<string, string> = {};
  if (!a.roles?.length) e[`${prefix}roles`] = "Choose at least one group";
  if ((a.cities?.length ?? 0) > LIMITS.cities) e[`${prefix}cities`] = `At most ${LIMITS.cities} cities`;
  else if (a.cities?.some((c) => c.trim().length < 2 || c.trim().length > 100 || !SAFE_LINE.test(c))) e[`${prefix}cities`] = "Enter a city name";
  if ((a.pincodes?.length ?? 0) > LIMITS.pincodes) e[`${prefix}pincodes`] = `At most ${LIMITS.pincodes} pincodes`;
  else if (a.pincodes?.some((p) => !PINCODE.test(p))) e[`${prefix}pincodes`] = "Enter a 6-digit pincode";
  const activity = a.orderActivity ?? "ANY";
  if (needsDays(activity) && !inDays(a.activityDays)) e[`${prefix}activityDays`] = "Between 1 and 365 days";
  if ((a.boughtCategoryIds?.length ?? 0) > LIMITS.categories) e[`${prefix}boughtCategoryIds`] = `At most ${LIMITS.categories} categories`;
  if (a.joinedWithinDays !== undefined && !inDays(a.joinedWithinDays)) e[`${prefix}joinedWithinDays`] = "Between 1 and 365 days";
  return e;
}

const inDays = (n: number | null | undefined) => typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= LIMITS.days;

/** Every problem with a campaign before it's saved (same words as the backend). */
export function campaignErrors(input: CampaignInput, now = Date.now()): Record<string, string> {
  const e: Record<string, string> = {};
  if (!input.name) e.name = "Give the campaign a name";
  else if (input.name.length > LIMITS.name) e.name = `At most ${LIMITS.name} characters`;
  else if (!SAFE_LINE.test(input.name)) e.name = "Remove special characters like < >";
  if (!input.title) e.title = "Add a title";
  else if (input.title.length > LIMITS.title) e.title = `At most ${LIMITS.title} characters, or phones cut it off`;
  else if (!SAFE_LINE.test(input.title)) e.title = "Remove special characters like < >";
  if (!input.body) e.body = "Add the message";
  else if (input.body.length > LIMITS.body) e.body = `At most ${LIMITS.body} characters`;
  else if (!SAFE_MULTILINE.test(input.body)) e.body = "Remove special characters like < >";
  if (input.link && (input.link.length > LIMITS.link || !APP_LINK.test(input.link))) e.link = "Use a link inside 360mart, like /fruits or /search?q=mango";
  if (input.timerStyle !== "NONE") {
    if (input.timerLabel && input.timerLabel.length > LIMITS.timerLabel) e.timerLabel = `At most ${LIMITS.timerLabel} characters`;
    else if (input.timerLabel && !SAFE_LINE.test(input.timerLabel)) e.timerLabel = "Remove special characters like < >";
    if (input.expiresAt === null) e.expiresAt = "A countdown needs the offer end time";
  }
  if (input.expiresAt !== null) {
    const t = Date.parse(input.expiresAt);
    if (Number.isNaN(t)) e.expiresAt = "Pick a date and time";
    else if (t < now + MIN_OFFER_MINUTES * 60_000) e.expiresAt = "The offer must end at least 15 minutes from now";
  }
  return { ...e, ...audienceErrors(input.audience, "audience.") };
}

/** Problems with a send time (null = now), as the backend's checkSchedule. `timer` = the campaign has a countdown. */
export function scheduleErrors(sendAt: string | null, expiresAt: string | null, now = Date.now(), timer = false): Record<string, string> {
  const e: Record<string, string> = {};
  const at = sendAt ? Date.parse(sendAt) : now;
  if (Number.isNaN(at)) e.sendAt = "Pick a date and time";
  else if (at < now - 60_000) e.sendAt = "Pick a time in the future";
  else if (at > now + MAX_SCHEDULE_DAYS * 86_400_000) e.sendAt = `At most ${MAX_SCHEDULE_DAYS} days ahead`;
  else if (isQuietTime(at)) e.sendAt = "Promotions can't go out between 21:00 and 09:00 (India time). Pick another time";
  if (!e.sendAt && expiresAt && Date.parse(expiresAt) < at + MIN_OFFER_MINUTES * 60_000) e.expiresAt = "The offer must end at least 15 minutes after it is sent";
  else if (!e.sendAt && timer && !expiresAt) e.expiresAt = "A countdown needs the offer end time";
  else if (!e.sendAt && timer && expiresAt && Date.parse(expiresAt) > at + MAX_TIMER_HOURS * 3_600_000)
    e.expiresAt = "With a countdown the offer must end within 24 hours of sending. Send it later, end it sooner, or turn the countdown off";
  return e;
}

// ---- India time ----

const IST_OFFSET_MS = 330 * 60_000;

/** "YYYY-MM-DDTHH:mm" in India time, for <input type="datetime-local">. */
export function istInput(iso: string | number): string {
  const t = typeof iso === "number" ? iso : Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t + IST_OFFSET_MS).toISOString().slice(0, 16);
}

/** The datetime-local value read as India time → UTC ISO (null when it isn't a full date and time). */
export function isoFromIstInput(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const t = Date.parse(`${value}:00+05:30`);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export function isQuietTime(t: number): boolean {
  const hour = new Date(t + IST_OFFSET_MS).getUTCHours();
  return hour >= QUIET_START || hour < QUIET_END;
}

/** The next moment promotions may go out (today or tomorrow 09:00 India time). */
export function nextSendWindow(now: number): number {
  if (!isQuietTime(now)) return now;
  const ist = new Date(now + IST_OFFSET_MS);
  const nine = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), QUIET_END, 0) - IST_OFFSET_MS;
  return nine > now ? nine : nine + 86_400_000;
}

// ---- cities / pincodes typed into a chip box ----

/** Split pasted text ("500072, 500081 500032") into separate entries. */
export function splitEntries(text: string, pincodes: boolean): string[] {
  const parts = pincodes ? text.split(/[\s,;]+/) : text.split(/[,;\n]+/);
  return parts.map((p) => p.trim().replace(/\s+/g, " ")).filter(Boolean);
}
