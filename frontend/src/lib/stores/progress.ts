// Registration progress, worked out from the backend's checklist. Shared by the
// shopkeeper's dashboard (server) and the registration page (client).

import type { StoreApplication } from "./types";

export type Step = "details" | "hours" | "documents" | "submit";

export const STEPS: { id: Step; label: string; short: string; text: string }[] = [
  { id: "details", label: "Store details", short: "Details", text: "Name, contact, address, map pin and delivery" },
  { id: "hours", label: "Opening hours", short: "Hours", text: "When you're open, day by day" },
  { id: "documents", label: "Documents", short: "Documents", text: "FSSAI licence, and GST certificate with a GSTIN" },
  { id: "submit", label: "Review and submit", short: "Submit", text: "Send it to our team for review" },
];

export function isStep(value: unknown): value is Step {
  return STEPS.some((s) => s.id === value);
}

export function isDone(app: StoreApplication | null, step: Step): boolean {
  if (!app) return false;
  const { checklist } = app;
  if (step === "details") return checklist.detailsComplete;
  if (step === "hours") return checklist.hoursSet;
  if (step === "documents") return checklist.requiredDocuments.every((d) => d.status === "PENDING" || d.status === "VERIFIED");
  return app.store.status !== "DRAFT" && app.store.status !== "REJECTED";
}

/** The first step still to do (submit once the others are done). */
export function firstOpenStep(app: StoreApplication | null): Step {
  return STEPS.find((s) => s.id !== "submit" && !isDone(app, s.id))?.id ?? "submit";
}

/** How many of the three fill-in steps are done. */
export function doneCount(app: StoreApplication | null): number {
  return STEPS.filter((s) => s.id !== "submit" && isDone(app, s.id)).length;
}
