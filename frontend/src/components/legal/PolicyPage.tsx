import { ArrowLeft, FileClock, FileText, History, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getPolicy, getPolicyVersion, getPolicyVersions } from "@/lib/legal/data";
import { POLICY_PAGES, POLICY_TYPES, type Policy, type PolicyType } from "@/lib/legal/types";
import { day } from "@/lib/orders/format";
import { PolicyMarkdown } from "./PolicyMarkdown";

// One legal page (/terms, /privacy, /refund-policy, /seller-agreement) or an
// old version of it (/terms/versions/2). Two cached calls: the policy and its
// version list (for "Earlier versions"). The text is Markdown, shown as text only.

export function PolicyPage({ type, version }: { type: PolicyType; version?: number }) {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <Suspense fallback={<PolicySkeleton />}>
          <PolicyBody type={type} version={version} />
        </Suspense>
      </div>
    </div>
  );
}

async function PolicyBody({ type, version }: { type: PolicyType; version?: number }) {
  const page = POLICY_PAGES[type];
  const [loaded, versions] = await Promise.all([version ? getPolicyVersion(type, version) : getPolicy(type), getPolicyVersions(type)]);
  const list = versions.ok ? versions.data : [];
  const current = list[0]?.version ?? null;
  const crumbs = version
    ? [
        { name: page.name, href: page.path },
        { name: `Version ${version}`, href: `${page.path}/versions/${version}` },
      ]
    : [{ name: page.name, href: page.path }];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={crumbs} />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="order-2 space-y-4 lg:sticky lg:top-24 lg:order-1">
          <PolicyNav current={type} />
          {list.length > 1 && <Versions type={type} list={list} shown={version ?? current} />}
        </aside>
        <div className="order-1 min-w-0 lg:order-2">
          {!loaded.ok ? (
            <Notice icon={FileText} title={`${page.name} couldn't be loaded`} text={loaded.error.message} />
          ) : !loaded.data ? (
            version ? (
              <Notice icon={FileClock} title={`There's no version ${version}`} text={`See the current ${page.name} instead.`} href={page.path} label={`Read the current ${page.name}`} />
            ) : (
              <Notice icon={FileClock} title={`${page.name} is coming soon`} text="It hasn't been published yet. If you have a question in the meantime, our support team is happy to help." href="/contact" label="Contact us" />
            )
          ) : (
            <Article policy={loaded.data} old={!!version && current !== null && version !== current} />
          )}
        </div>
      </div>
    </div>
  );
}

function Article({ policy, old }: { policy: Policy; old: boolean }) {
  const page = POLICY_PAGES[policy.policyType];
  return (
    <article className="overflow-hidden rounded-3xl bg-white ring-1 ring-line motion-safe:animate-fade-up">
      <header className="relative overflow-hidden border-b border-line bg-gradient-to-br from-brand-soft/70 via-white to-white px-5 py-7 sm:px-10 sm:py-10">
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-brand/10 blur-2xl" />
        <p className="relative text-xs font-bold uppercase tracking-[0.14em] text-brand-deep">Legal</p>
        <h1 className="relative mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{policy.title}</h1>
        <p className="relative mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 font-semibold text-ink ring-1 ring-line">Version {policy.version}</span>
          <span>Updated on {day(policy.publishedAt)}</span>
        </p>
        {old && (
          <p className="relative mt-5 flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
            <History aria-hidden className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">This is an earlier version, kept for your records.</span>
            <Link href={page.path} className="inline-flex min-h-10 items-center gap-1 font-semibold underline underline-offset-2">
              <ArrowLeft aria-hidden className="size-4" />
              Current version
            </Link>
          </p>
        )}
        {!old && policy.changeSummary && (
          <div className="relative mt-5 flex gap-3 rounded-2xl bg-white/80 px-4 py-3 text-sm ring-1 ring-line backdrop-blur">
            <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-deep" />
            <p className="min-w-0 text-ink/85">
              <span className="font-semibold text-ink">What changed: </span>
              {policy.changeSummary}
            </p>
          </div>
        )}
      </header>
      <div className="px-5 py-7 sm:px-10 sm:py-10">
        <PolicyMarkdown content={policy.content ?? ""} />
        <div className="mt-10 flex flex-col gap-3 rounded-2xl bg-surface p-4 text-sm sm:flex-row sm:items-center">
          <Mail aria-hidden className="size-5 shrink-0 text-brand-deep" />
          <p className="min-w-0 flex-1 text-ink/85">Questions about this policy, or a complaint? Our support team and grievance officer can help.</p>
          <Link href="/contact" className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-ink px-4 font-semibold text-white hover:bg-ink/85">
            Contact us
          </Link>
        </div>
      </div>
    </article>
  );
}

/** The other legal pages, as a side menu (a row of chips under the text on phones). */
export function PolicyNav({ current }: { current: PolicyType | "CONTACT" }) {
  const links = [...POLICY_TYPES.map((t) => ({ key: t as PolicyType | "CONTACT", ...POLICY_PAGES[t] })), { key: "CONTACT" as const, path: "/contact", name: "Contact & grievances" }];
  return (
    <nav aria-label="Legal pages" className="rounded-3xl bg-white p-3 ring-1 ring-line">
      <p className="px-2 pb-2 pt-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">Policies</p>
      <ul className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-0.5">
        {links.map((l) => {
          const active = l.key === current;
          return (
            <li key={l.key}>
              <Link
                href={l.path}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold transition ${active ? "bg-ink text-white" : "text-ink hover:bg-surface"} max-lg:rounded-full max-lg:ring-1 max-lg:ring-line`}
              >
                {l.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Versions({ type, list, shown }: { type: PolicyType; list: Policy[]; shown: number | null }) {
  const page = POLICY_PAGES[type];
  return (
    <section aria-labelledby="versions-title" className="rounded-3xl bg-white p-3 ring-1 ring-line">
      <h2 id="versions-title" className="px-2 pb-2 pt-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
        Version history
      </h2>
      <ul className="space-y-0.5">
        {list.slice(0, 12).map((v, i) => {
          const href = i === 0 ? page.path : `${page.path}/versions/${v.version}`;
          const active = v.version === shown;
          return (
            <li key={v.version}>
              <Link href={href} aria-current={active ? "page" : undefined} className={`flex min-h-10 items-center justify-between gap-2 rounded-xl px-3 text-sm transition ${active ? "bg-surface font-semibold text-ink" : "text-muted hover:bg-surface hover:text-ink"}`}>
                <span>
                  Version {v.version}
                  {i === 0 && <span className="ml-1.5 rounded-full bg-fresh-soft px-1.5 py-0.5 text-[11px] font-bold text-fresh">Current</span>}
                </span>
                <span className="shrink-0 text-xs">{day(v.publishedAt)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Notice({ icon: Icon, title, text, href, label }: { icon: typeof FileText; title: string; text: string; href?: string; label?: string }) {
  return (
    <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-line">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand-deep">
        <Icon aria-hidden className="size-7" />
      </span>
      <h1 className="mt-4 text-xl font-bold text-ink">{title}</h1>
      <p className="mt-1 max-w-md text-muted">{text}</p>
      {href && label && (
        <Link href={href} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85">
          {label}
        </Link>
      )}
    </div>
  );
}

/** The page's frame while the URL is read (old-version routes). */
export function PolicyFrame() {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <PolicySkeleton />
      </div>
    </div>
  );
}

export function PolicySkeleton() {
  return (
    <div aria-hidden className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div className="order-2 h-64 animate-pulse rounded-3xl bg-line/60 lg:order-1" />
      <div className="order-1 h-[36rem] animate-pulse rounded-3xl bg-line/60 lg:order-2" />
    </div>
  );
}
