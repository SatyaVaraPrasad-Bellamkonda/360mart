// Small display helpers for support requests. Safe for client and server code.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "3 h 20 min left" / "2 days late", for the legal deadlines. */
export function timeLeft(iso: string, now: number): { text: string; late: boolean; soon: boolean } {
  const ms = Date.parse(iso) - now;
  const late = ms < 0;
  const a = Math.abs(ms);
  let text: string;
  if (a >= 2 * DAY) text = `${Math.floor(a / DAY)} days`;
  else if (a >= HOUR) text = `${Math.floor(a / HOUR)} h${a % HOUR >= MINUTE ? ` ${Math.floor((a % HOUR) / MINUTE)} min` : ""}`;
  else text = `${Math.max(1, Math.floor(a / MINUTE))} min`;
  return { text: late ? `${text} late` : `${text} left`, late, soon: !late && ms < 6 * HOUR };
}

/** Ticket page versions: a new reply or status moves lastActivityAt. */
export const ticketVersion = (t: { ticketId: string; lastActivityAt: string; status: string; images: unknown[] }) => `${t.ticketId}@${t.lastActivityAt}:${t.status}:${t.images.length}`;
