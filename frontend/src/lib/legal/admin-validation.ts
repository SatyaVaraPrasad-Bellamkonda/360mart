// The admin's "publish a new version" form: the same rules as the backend's
// PublishPolicyRequest. Safe for client and server code.

export const POLICY_LIMITS = { title: 120, content: 200_000, changeSummary: 500 } as const;

// No control characters, and no < > in one-line fields (the backend refuses them).
const SAFE_LINE = /^[^\x00-\x1F\x7F<>]*$/;
// Markdown text: any character except control characters other than tab and line breaks.
const SAFE_TEXT = /^[^\x00-\x08\x0B\x0C\x0E-\x1F\x7F]*$/;

export type PolicyDraft = { title: string; content: string; changeSummary: string; requiresReacceptance: boolean };
export type PolicyField = "title" | "content" | "changeSummary";

export function policyErrors(d: PolicyDraft): Partial<Record<PolicyField, string>> {
  const e: Partial<Record<PolicyField, string>> = {};
  const title = d.title.trim();
  if (!title) e.title = "Add a title";
  else if (title.length > POLICY_LIMITS.title) e.title = `At most ${POLICY_LIMITS.title} characters`;
  else if (!SAFE_LINE.test(title)) e.title = "Remove special characters like < >";

  if (!d.content.trim()) e.content = "Add the text of the policy";
  else if (d.content.length > POLICY_LIMITS.content) e.content = `At most ${POLICY_LIMITS.content.toLocaleString("en-IN")} characters`;
  else if (!SAFE_TEXT.test(d.content)) e.content = "The text contains characters that are not allowed";

  const summary = d.changeSummary.trim();
  if (summary.length > POLICY_LIMITS.changeSummary) e.changeSummary = `At most ${POLICY_LIMITS.changeSummary} characters`;
  else if (!SAFE_LINE.test(summary)) e.changeSummary = "Remove special characters like < > and line breaks";
  return e;
}
