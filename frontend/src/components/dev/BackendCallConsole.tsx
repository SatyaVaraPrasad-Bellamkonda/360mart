"use client";

import { useEffect } from "react";

type ApiCall = {
  seq: number;
  at: string;
  requestId: string;
  origin: string;
  method: string;
  path: string;
  status: number;
  ms: number;
  errorCode?: string;
  failed?: string;
  request?: unknown;
  response?: unknown;
};

const LAST_SEEN = "360mart.dev.lastBackendCall";

// Development only (rendered by the root layout when NODE_ENV is development):
// prints every backend call the Next server makes into this browser's console,
// one collapsible group each with the masked request and response, like the
// AngularJS $http calls used to show. Filter the console by "[api]".
export function BackendCallConsole() {
  useEffect(() => {
    let since = 0;
    try {
      since = Number(sessionStorage.getItem(LAST_SEEN)) || 0;
    } catch {
      // storage blocked: start from the last few seconds
    }
    const source = new EventSource(`/api/dev/backend-calls?since=${since}`);
    source.onmessage = (event) => {
      const call = JSON.parse(event.data) as ApiCall;
      try {
        sessionStorage.setItem(LAST_SEEN, String(call.seq));
      } catch {
        // ignore
      }
      const bad = call.failed || call.status >= 400;
      const outcome = call.failed ? `failed: ${call.failed}` : `${call.status}${call.errorCode ? ` ${call.errorCode}` : ""}`;
      console.groupCollapsed(`%c[api]%c ${call.method} ${call.path} %c${outcome}%c ${call.ms}ms · ${call.origin}`, "color:#0891b2;font-weight:bold", "font-weight:bold", bad ? "color:#dc2626;font-weight:bold" : "color:#16a34a;font-weight:bold", "color:gray");
      console.log("made by:", call.origin);
      if (call.requestId === "-") console.log("request id: none (cached call: its answer is shared by every visitor, so it belongs to no single request)");
      else console.log("request id:", call.requestId, "(X-Request-Id on the request's response in Network)");
      if (call.request !== undefined) console.log("request:", call.request);
      if (call.response !== undefined) console.log("response:", call.response);
      console.log("time:", new Date(call.at).toLocaleTimeString());
      console.groupEnd();
    };
    return () => source.close();
  }, []);
  return null;
}
