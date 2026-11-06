// Promotional notifications (campaigns): the admin's campaigns and the
// shopper's offers inbox. Shapes = the backend's CampaignResponse,
// CampaignSummaryResponse, NotificationResponse. Times are UTC ISO strings.

export const CAMPAIGN_STATUSES = ["DRAFT", "SCHEDULED", "SENDING", "SENT", "CANCELLED"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export type CampaignAction = "EDIT" | "DELETE" | "TEST" | "SCHEDULE" | "UNSCHEDULE" | "CANCEL" | "DUPLICATE";

export const AUDIENCE_ROLES = ["CUSTOMER", "STORE_OWNER"] as const;
export type AudienceRole = (typeof AUDIENCE_ROLES)[number];

export const PLATFORMS = ["ANDROID", "IOS"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const ORDER_ACTIVITIES = ["ANY", "NEVER_ORDERED", "ORDERED_RECENTLY", "LAPSED"] as const;
export type OrderActivity = (typeof ORDER_ACTIVITIES)[number];

/** Who gets it. Every filter given must match; empty lists are ignored. */
export type CampaignAudience = {
  roles?: AudienceRole[];
  platforms?: Platform[];
  cities?: string[];
  pincodes?: string[];
  orderActivity?: OrderActivity;
  activityDays?: number | null;
  boughtCategoryIds?: number[];
  joinedWithinDays?: number | null;
};

/**
 * The countdown on an Android push: NONE, SIMPLE (a ticking clock in the
 * notification's header) or BANNER (a coloured strip with a big clock). It
 * counts down to expiresAt. iPhones show no ticking clock: their push gets
 * "Ends 11:00 am" (India time) added to the text instead.
 */
export const TIMER_STYLES = ["NONE", "SIMPLE", "BANNER"] as const;
export type TimerStyle = (typeof TIMER_STYLES)[number];
export const TIMER_THEMES = ["GOLD", "INK", "TEAL", "RED"] as const;
export type TimerTheme = (typeof TIMER_THEMES)[number];
/** The banner's exact colours (= what Android draws). */
export const TIMER_COLOURS: Record<TimerTheme, { name: string; background: string; text: string }> = {
  GOLD: { name: "Gold", background: "#FFC629", text: "#1A1A1A" },
  INK: { name: "Ink", background: "#1F2430", text: "#FFFFFF" },
  TEAL: { name: "Teal", background: "#00695C", text: "#FFFFFF" },
  RED: { name: "Red", background: "#C62828", text: "#FFFFFF" },
};
export const DEFAULT_TIMER_LABEL = "Offer ends in";

/** Body of POST / PUT /admin/campaigns. */
export type CampaignInput = {
  name: string;
  title: string;
  body: string;
  imageId: string | null;
  link: string | null;
  expiresAt: string | null;
  /** Label and theme are null when the style is NONE. */
  timerStyle: TimerStyle;
  timerLabel: string | null;
  timerTheme: TimerTheme | null;
  audience: CampaignAudience;
};

export type CampaignStats = {
  pending: number;
  sent: number;
  noDevice: number;
  capped: number;
  optedOut: number;
  failed: number;
  expired: number;
  cancelled: number;
  opened: number;
};

export type Campaign = {
  campaignId: string;
  name: string;
  title: string;
  body: string;
  imageId: string | null;
  imageUrl: string | null;
  link: string | null;
  expiresAt: string | null;
  /** Missing on campaigns from before countdowns = NONE. */
  timerStyle?: TimerStyle | null;
  timerLabel?: string | null;
  timerTheme?: TimerTheme | null;
  audience: CampaignAudience | null;
  status: CampaignStatus;
  sendAt: string | null;
  targetCount: number | null;
  stats: CampaignStats | null;
  allowedActions: CampaignAction[];
  createdAt: string;
  updatedAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  cancelledAt: string | null;
};

export type CampaignSummary = {
  campaignId: string;
  name: string;
  title: string;
  status: CampaignStatus;
  sendAt: string | null;
  createdAt: string;
  targetCount: number | null;
  sent: number;
  opened: number;
};

export type AudienceCount = { users: number; reachableByPush: number };

export type CampaignWrite = { success: boolean; message: string; id?: string };

// ---- shopper ----

export type InboxItem = {
  campaignId: string;
  title: string;
  body: string;
  imageUrl: string | null;
  link: string | null;
  receivedAt: string;
  expiresAt: string | null;
  opened: boolean;
};

export type NotificationPreferences = { offers: boolean };
