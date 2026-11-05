// The home page HTML block: limits, what admins may write (= the backend's
// HtmlBlockSanitizer allowlist, shown as help text), a quick check while typing
// that names the first thing the backend would refuse (the backend is the real
// check, on save), the schedule and the starter templates. Safe for client and
// server code.

import type { HtmlBlockSection } from "./types";

export const HTML_LIMITS = { html: 20_000, linkLabel: 80, blocks: 5 } as const;

/** Our own pages only: "/", "/fruits", "/search?q=mango", "/#categories" (= the backend's APP_LINK). */
export const HTML_BLOCK_LINK = /^(?!.*\/\/)\/([a-z0-9][a-z0-9/_-]{0,199})?(\?[A-Za-z0-9=&%._+-]{1,200})?(#[a-z0-9-]{1,40})?$/;

const ELEMENTS = new Set([
  "div", "span", "p", "br", "hr", "h2", "h3", "h4", "h5", "h6", "strong", "b", "em", "i", "u", "s", "small", "mark", "sub", "sup",
  "ul", "ol", "li", "blockquote", "section", "article", "figure", "figcaption", "table", "thead", "tbody", "tr", "th", "td", "img", "a",
]);
const ATTRIBUTES: Record<string, string[]> = { img: ["src", "alt", "width", "height", "loading"], td: ["colspan", "rowspan"], th: ["colspan", "rowspan"], a: ["href"] };
const REFUSED_CSS = ["position", "z-index", "top", "left", "right", "bottom", "inset", "transform", "animation", "transition", "cursor", "filter", "backdrop-filter", "pointer-events", "content"];

/** Help text: what can go into a block. */
export const HTML_HELP = {
  elements: [
    ["Text", "div span p br hr h2–h6 strong b em i u s small mark sub sup"],
    ["Lists and quotes", "ul ol li blockquote"],
    ["Structure", "section article figure figcaption"],
    ["Tables", "table thead tbody tr th td"],
    ["Pictures and links", "img a"],
  ],
  attributes: [
    ["Everything", "style"],
    ["img", "src (https), alt, width, height (pixels), loading (lazy or eager)"],
    ["td, th", "colspan, rowspan"],
    ["a", "href: our own pages, like /fruits/mangoes"],
  ],
  css: "Colours, fonts and text styling · backgrounds with gradients or https pictures · margins (not negative), padding, borders, radius, shadows · sizes, aspect-ratio, object-fit · display (block, inline-block, flex, grid, none), flex and grid layouts, gap, order · rgb(), hsl(), gradients, calc(), min(), max(), clamp(), repeat(), minmax()",
  refused: "class, id, on… handlers · position, z-index, top/left/right/bottom, transform, animation, transition, cursor, filter · <style>, <script>, iframes, forms, SVG, comments",
} as const;

/**
 * The first thing in the HTML the backend would refuse, worded like the
 * backend, or null. A quick check while typing (regex, not a parser): the
 * server's sanitizer decides on save.
 */
export function htmlProblem(html: string, blockLinked: boolean): string | null {
  if (!html.trim()) return null;
  if (html.length > HTML_LIMITS.html) return `At most ${HTML_LIMITS.html.toLocaleString("en-IN")} characters`;
  if (/<!--/.test(html)) return "Remove comments: they aren't allowed.";
  for (const m of html.matchAll(/<\s*([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g)) {
    const tag = m[1].toLowerCase();
    const attrs = m[2] ?? "";
    if (tag === "h1") return "Use h2 to h6: the page already has its main heading";
    if (tag === "script") return "Remove <script>: scripts aren't allowed.";
    if (tag === "style") return "Remove <style>: use the style attribute instead.";
    if (!ELEMENTS.has(tag)) return `Remove <${tag}>: it isn't allowed.`;
    for (const a of attrs.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g)) {
      const name = a[1].toLowerCase();
      const value = (a[2] ?? "").replace(/^["']|["']$/g, "").trim();
      if (name.startsWith("on")) return `Remove ${name}: event handlers aren't allowed.`;
      if (name === "class") return "Remove class: use the style attribute instead.";
      if (name === "style") {
        const css = styleProblem(value);
        if (css) return css;
        continue;
      }
      if (!(ATTRIBUTES[tag] ?? []).includes(name)) return `Remove ${name}: it isn't allowed on <${tag}>.`;
      if (tag === "img" && name === "src" && !/^https:\/\//i.test(value)) return "Images must use https links.";
      if (tag === "a" && name === "href") {
        if (blockLinked) return "The whole block is already a link: remove the links inside, or remove the block link";
        if (!HTML_BLOCK_LINK.test(value)) return "Links must go to a page on 360mart, like /fruits/mangoes.";
      }
    }
    if (tag === "a" && blockLinked) return "The whole block is already a link: remove the links inside, or remove the block link";
  }
  if (/javascript:/i.test(html)) return "Remove javascript: links: they aren't allowed.";
  return null;
}

function styleProblem(css: string): string | null {
  for (const decl of css.split(";")) {
    const [rawName, ...rest] = decl.split(":");
    const name = rawName?.trim().toLowerCase();
    if (!name) continue;
    const value = rest.join(":").trim().toLowerCase();
    if (REFUSED_CSS.some((p) => name === p || name.startsWith(`${p}-`))) return `Remove ${name} from the style: it isn't allowed.`;
    if (name.startsWith("margin") && /(^|\s)-\d/.test(value)) return "Margins can't be negative.";
    if (/url\(\s*['"]?(?!https:)/i.test(value)) return "Images must use https links.";
    if (/expression\(|javascript:/i.test(value)) return `Remove ${name} from the style: it isn't allowed.`;
  }
  return null;
}

/**
 * A last tripwire for the shop page: the backend has already cleaned the HTML,
 * so this should never fire; if something dangerous slips through anyway, the
 * block isn't shown at all.
 */
export const looksUnsafe = (html: string) => /<\s*(script|style|iframe|object|embed|form|link|meta|base|svg|input|button|textarea)\b|\son[a-z]+\s*=|javascript:|position\s*:/i.test(html);

export type HtmlBlockState = "LIVE" | "SCHEDULED" | "ENDED";

/** Where a block is in its schedule at `now` (no dates = always live). */
export function htmlBlockState(s: Pick<HtmlBlockSection, "startsAt" | "endsAt">, now: number): HtmlBlockState {
  if (s.endsAt && Date.parse(s.endsAt) <= now) return "ENDED";
  if (s.startsAt && Date.parse(s.startsAt) > now) return "SCHEDULED";
  return "LIVE";
}

/** Ready-made starting points, all within the allowed tags and CSS. */
export const HTML_TEMPLATES: { id: string; name: string; text: string; html: string }[] = [
  {
    id: "offer-strip",
    name: "Offer strip",
    text: "A bold one-line offer",
    html: `<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:18px 24px;border-radius:20px;background:linear-gradient(90deg,#f59e0b,#b45309);color:#ffffff;">
  <div>
    <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;opacity:0.9;">This week only</p>
    <h2 style="margin:4px 0 0;font-size:24px;font-weight:800;line-height:1.2;">Fresh mangoes from stores near you</h2>
  </div>
  <span style="display:inline-block;padding:10px 18px;border-radius:999px;background:#ffffff;color:#0f172a;font-weight:700;font-size:14px;">Shop mangoes</span>
</div>`,
  },
  {
    id: "two-column",
    name: "Picture and text",
    text: "A picture beside a headline",
    html: `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:20px;padding:20px;border-radius:24px;background:#fff7ed;border:1px solid #fed7aa;">
  <img src="https://example.com/your-picture.jpg" alt="Fresh fruit basket" width="320" height="200" style="flex:1 1 240px;max-width:100%;height:auto;border-radius:16px;object-fit:cover;" />
  <div style="flex:1 1 260px;">
    <h2 style="margin:0;font-size:26px;font-weight:800;color:#0f172a;line-height:1.2;">Weekend fruit festival</h2>
    <p style="margin:8px 0 0;font-size:16px;color:#475569;line-height:1.6;">Seasonal fruits from your neighbourhood stores, picked fresh every morning.</p>
  </div>
</div>`,
  },
  {
    id: "announcement",
    name: "Announcement",
    text: "A calm notice for shoppers",
    html: `<div style="padding:16px 20px;border-radius:16px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;">
  <p style="margin:0;font-size:15px;line-height:1.6;"><strong>Diwali timings:</strong> some stores close early on 12 November. Check the store's hours on the product page before you order.</p>
</div>`,
  },
];
