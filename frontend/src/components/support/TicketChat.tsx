import { Lock } from "lucide-react";
import { when } from "@/lib/orders/format";
import { AUTHOR_LABEL, type Ticket, type TicketAuthor } from "@/lib/support/types";

type Viewer = "CUSTOMER" | "STORE" | "ADMIN";

// The request as a conversation: the customer's description first, then every
// message. The viewer's own side is on the right. Internal notes only reach
// admins (the backend leaves them out for others) and look like sticky notes.
export function TicketChat({ t, viewer }: { t: Ticket; viewer: Viewer }) {
  const mine = (a: TicketAuthor) => a === viewer;
  const name = (a: TicketAuthor) => {
    if (a === "CUSTOMER") return viewer === "CUSTOMER" ? "You" : (t.customer?.name ?? "Customer");
    if (a === "STORE") return viewer === "STORE" ? "You" : (t.storeName ?? "Store");
    if (a === "ADMIN") return viewer === "ADMIN" ? "Support (you)" : AUTHOR_LABEL.ADMIN;
    return AUTHOR_LABEL.SYSTEM;
  };
  return (
    <ol aria-label="Conversation" className="space-y-4">
      <Bubble author="CUSTOMER" name={name("CUSTOMER")} at={t.createdAt} body={t.description} right={mine("CUSTOMER")} first />
      {t.messages.map((m, i) =>
        m.author === "SYSTEM" ? (
          <li key={i} className="flex justify-center">
            <span className="max-w-[90%] rounded-full bg-surface px-3 py-1 text-center text-xs text-muted ring-1 ring-line">
              {m.body} · {when(m.createdAt)}
            </span>
          </li>
        ) : (
          <Bubble key={i} author={m.author} name={name(m.author)} at={m.createdAt} body={m.body} right={mine(m.author)} internal={m.internal} />
        ),
      )}
    </ol>
  );
}

const TONE: Record<Exclude<TicketAuthor, "SYSTEM">, string> = {
  CUSTOMER: "bg-white ring-1 ring-line",
  STORE: "bg-violet-50 ring-1 ring-violet-200",
  ADMIN: "bg-sky-50 ring-1 ring-sky-200",
};

function Bubble({ author, name, at, body, right, internal, first }: { author: TicketAuthor; name: string; at: string; body: string; right: boolean; internal?: boolean; first?: boolean }) {
  const tone = internal ? "bg-yellow-50 ring-1 ring-yellow-300 border-dashed" : right ? "bg-ink text-white" : TONE[author as Exclude<TicketAuthor, "SYSTEM">];
  return (
    <li className={`flex ${right ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[88%] sm:max-w-[75%] ${right ? "items-end" : "items-start"} flex flex-col`}>
        <p className="mb-1 flex flex-wrap items-center gap-1.5 px-1 text-xs text-muted">
          <span className="font-semibold text-ink">{name}</span>
          {internal && (
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-200 px-1.5 py-0.5 text-[11px] font-bold text-yellow-900">
              <Lock aria-hidden className="size-3" /> Internal note
            </span>
          )}
          {first && <span className="rounded-full bg-surface px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-line">Problem</span>}
          <span aria-hidden>·</span>
          <time dateTime={at}>{when(at)}</time>
        </p>
        <div className={`whitespace-pre-line break-words rounded-2xl px-4 py-3 text-sm leading-relaxed ${right ? "rounded-br-md" : "rounded-bl-md"} ${tone} ${internal ? "text-yellow-950" : right ? "" : "text-ink"}`}>
          {body}
        </div>
      </div>
    </li>
  );
}
