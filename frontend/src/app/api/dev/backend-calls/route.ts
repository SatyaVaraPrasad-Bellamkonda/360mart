import type { NextRequest } from "next/server";
import { apiLogMode, onApiCall, recentCalls, type ApiCall } from "@/lib/backend/api-log";

// Development only: streams the backend call log (lib/backend/api-log.ts) to
// <BackendCallConsole> as server-sent events. Each event is also visible in
// DevTools → Network → backend-calls → EventStream. 404 in production.
// ?since=<seq> first sends the calls after that one: a page's own server
// render happens before its browser can connect, so it asks for those too.
export function GET(request: NextRequest) {
  if (apiLogMode() !== "full") return new Response(null, { status: 404 });
  const since = Number(request.nextUrl.searchParams.get("since"));
  const encoder = new TextEncoder();
  let stop = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (call: ApiCall) => controller.enqueue(encoder.encode(`id: ${call.seq}\ndata: ${JSON.stringify(call)}\n\n`));
      // A first visit gets only the last few seconds' calls, not the whole history.
      const backlog = Number.isFinite(since) && since > 0 ? recentCalls(since) : recentCalls(0).filter((c) => Date.now() - Date.parse(c.at) < 10_000);
      backlog.forEach(send);
      const unsubscribe = onApiCall(send);
      const ping = setInterval(() => controller.enqueue(encoder.encode(": ping\n\n")), 15_000);
      stop = () => {
        unsubscribe();
        clearInterval(ping);
      };
      request.signal.addEventListener("abort", () => {
        stop();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      stop();
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
