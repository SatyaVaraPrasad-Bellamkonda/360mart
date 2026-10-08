import Link from "next/link";

// The 360mart mark: a cart carrying one product from each category
// (fruit, groceries, fashion, fish) with "360" on the basket.
// Keep in sync with public/logo-mark.svg and src/app/icon.svg.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 76" className={className} aria-hidden>
      <rect x="35" y="11" width="12" height="21" rx="1.5" fill="#38bdf8" />
      <path d="M35 11.5 L41 5 L47 11.5 Z" fill="#0284c7" />
      <rect x="38" y="16" width="6" height="5" rx="1" fill="#ffffff" />
      <path d="M55 9 l-6 4 l3 5.5 l3.2 -1.8 v15 h13.6 v-15 l3.2 1.8 l3 -5.5 l-6 -4 q-7 4.5 -14 0 z" fill="#8b5cf6" />
      <g transform="rotate(-38 82 20)">
        <ellipse cx="81" cy="20" rx="9" ry="4.8" fill="#14b8a6" />
        <path d="M89 20 L95 14.5 L95 25.5 Z" fill="#0d9488" />
        <circle cx="76" cy="19" r="1.2" fill="#ffffff" />
      </g>
      <circle cx="25" cy="22" r="9" fill="#ef4444" />
      <path d="M25 13.5 q0 -4 3 -6" stroke="#7c2d12" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M27 10 q5 -4 8 0 q-5 3 -8 0 z" fill="#22c55e" />
      <path d="M3 10 H11 L20 56 H82" fill="none" stroke="#0f172a" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 29 H95 L88 50 H19 Z" fill="#f59e0b" stroke="#0f172a" strokeWidth="4" strokeLinejoin="round" />
      <text x="55" y="46" textAnchor="middle" fontSize="17" fontWeight="800" letterSpacing="-0.5" fill="#0f172a" style={{ fontFamily: "inherit" }}>
        360
      </text>
      <circle cx="29" cy="66" r="6" fill="#0f172a" />
      <circle cx="75" cy="66" r="6" fill="#0f172a" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="360mart home">
      <LogoMark className="h-12 w-auto" />
      <span className="text-2xl font-extrabold tracking-tight text-ink">
        360<span className="text-brand">mart</span>
        <span className="text-muted">.in</span>
      </span>
    </Link>
  );
}
