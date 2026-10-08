// Phone-layout check: opens each page at 360px and 390px wide in headless
// Chrome and reports sideways scrolling, text under 11px and tap targets
// under 32px tall.
//
// Usage (with the site running, e.g. `npm run build && npx next start -p 3360`):
//   node scripts/check-mobile.mjs [baseUrl] [path ...]
//   node scripts/check-mobile.mjs http://localhost:3360 / /fruits /login
// Set CHROME=/path/to/chrome if Chrome isn't in the default macOS location.

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [base = "http://localhost:3360", ...paths] = process.argv.slice(2);
const pages = paths.length
  ? paths
  : ["/", "/fruits", "/fruits/apples", "/fruits/apples/shimla-apple", "/login", "/seller/login", "/admin/login"];
const chromePath = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9400 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), "check-mobile-"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(chromePath, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], {
  stdio: "ignore",
});

let ws;
for (let i = 0; i < 40 && !ws; i++) {
  try {
    const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    const page = targets.find((t) => t.type === "page");
    if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
  } catch {}
  if (!ws) await sleep(250);
}
await new Promise((r) => (ws.onopen = r));

let id = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) {
    pending.get(d.id)(d);
    pending.delete(d.id);
  }
};
const send = (method, params = {}) =>
  new Promise((r) => {
    pending.set(++id, r);
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) =>
  (await send("Runtime.evaluate", { expression, returnByValue: true })).result?.result?.value;

const AUDIT = `(() => {
  const vw = document.documentElement.clientWidth;
  const visible = (el) => { const b = el.getBoundingClientRect(); return b.width > 1 && b.height > 1; };
  const overflow = document.documentElement.scrollWidth - vw;
  const tinyText = [...document.querySelectorAll('p,span,a,button,label,li,dd,dt')]
    .filter((el) => el.childElementCount === 0 && el.innerText?.trim() && visible(el) && parseFloat(getComputedStyle(el).fontSize) < 11)
    .map((el) => el.innerText.trim().slice(0, 25));
  const smallTaps = [...document.querySelectorAll('a,button,input:not([type=hidden]),select,summary')]
    .filter((el) => visible(el) && el.getBoundingClientRect().height < 32 && !el.closest('nav[aria-label=Breadcrumb], footer'))
    .map((el) => (el.innerText || el.name || el.tagName).trim().slice(0, 25));
  return { overflow, tinyText, smallTaps };
})()`;

let problems = 0;
await send("Page.enable");
for (const width of [360, 390]) {
  await send("Emulation.setDeviceMetricsOverride", { width, height: 800, deviceScaleFactor: 2, mobile: true });
  for (const path of pages) {
    await send("Page.navigate", { url: base + path });
    await sleep(1500);
    const r = await evaluate(AUDIT);
    const issues = [
      r.overflow > 0 && `scrolls sideways by ${r.overflow}px`,
      r.tinyText.length && `tiny text: ${r.tinyText.join(", ")}`,
      r.smallTaps.length && `small tap targets: ${r.smallTaps.join(", ")}`,
    ].filter(Boolean);
    problems += issues.length;
    console.log(`${issues.length ? "CHECK" : "OK   "} ${width}px ${path}${issues.length ? "  → " + issues.join("; ") : ""}`);
  }
}

ws.close();
chrome.kill();
rmSync(profile, { recursive: true, force: true });
console.log(problems ? `\n${problems} issue(s) to review (visually hidden inputs behind styled labels are expected).` : "\nAll pages pass.");
