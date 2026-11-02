import { Building2, Clock, LifeBuoy, Mail, MessageSquareText, Phone, Scale, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { PolicyNav, PolicySkeleton } from "@/components/legal/PolicyPage";
import { getContact } from "@/lib/legal/data";
import type { SupportContact } from "@/lib/legal/types";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact us & grievance officer",
  description: "Reach 360mart customer support by email or phone, raise a request about an order, or contact our grievance officer.",
  alternates: { canonical: "/contact" },
};

// /contact: support details and the grievance officer (required by India's
// consumer-protection and IT rules), from one cached call (GET /legal/contact).
// Empty values are hidden.
export default function ContactPage() {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <Suspense fallback={<PolicySkeleton />}>
          <Contact />
        </Suspense>
      </div>
    </div>
  );
}

async function Contact() {
  const loaded = await getContact();
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ name: "Contact us", href: "/contact" }]} />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="order-2 lg:sticky lg:top-24 lg:order-1">
          <PolicyNav current="CONTACT" />
        </aside>
        <div className="order-1 min-w-0 space-y-6 lg:order-2">
          {loaded.ok ? (
            <Details c={loaded.data} />
          ) : (
            <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-line">
              <h1 className="text-xl font-bold text-ink">Contact us</h1>
              <p className="mt-1 text-muted">{loaded.error.message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Details({ c }: { c: SupportContact }) {
  const g = c.grievanceOfficer;
  const hasOfficer = !!(g.name || g.email || g.phone);
  return (
    <>
      {c.companyName && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: c.companyName,
            url: SITE.url,
            ...(c.companyAddress ? { address: c.companyAddress } : {}),
            contactPoint: [{ "@type": "ContactPoint", contactType: "customer support", areaServed: "IN", ...(c.supportEmail ? { email: c.supportEmail } : {}), ...(c.supportPhone ? { telephone: c.supportPhone } : {}) }],
          }}
        />
      )}

      <section className="relative overflow-hidden rounded-3xl bg-ink px-5 py-8 text-white sm:px-10 sm:py-12 motion-safe:animate-fade-up">
        <span aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-brand/25 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-24 left-10 size-56 rounded-full bg-sky-400/15 blur-3xl" />
        <p className="relative text-xs font-bold uppercase tracking-[0.14em] text-brand">Help & support</p>
        <h1 className="relative mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">We&apos;re here to help</h1>
        <p className="relative mt-3 max-w-xl text-white/75">
          A problem with an order, a question about your account, or feedback. We acknowledge every request within {c.acknowledgeWithin} and aim to resolve it within {c.resolveWithin}.
        </p>
        <div className="relative mt-6 flex flex-wrap gap-2">
          <Link href="/account/support" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-bold text-ink transition hover:bg-amber-400">
            <MessageSquareText aria-hidden className="size-4" />
            Raise a request
          </Link>
          <Link href="/account/orders" className="inline-flex min-h-11 items-center rounded-full bg-white/10 px-5 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/15">
            Problem with an order
          </Link>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(13rem,1fr))]">
        {c.supportEmail && <Way icon={Mail} label="Email" value={c.supportEmail} href={`mailto:${c.supportEmail}`} />}
        {c.supportPhone && <Way icon={Phone} label="Phone" value={c.supportPhone} href={`tel:${c.supportPhone.replace(/[^\d+]/g, "")}`} />}
        {c.supportHours && <Way icon={Clock} label="Hours" value={c.supportHours} />}
      </div>

      <section aria-labelledby="grievance-title" className="rounded-3xl bg-white p-5 ring-1 ring-line sm:p-8">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <Scale aria-hidden className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id="grievance-title" className="text-xl font-bold text-ink">
              Grievance officer
            </h2>
            <p className="mt-1 text-sm text-muted">
              If you&apos;re not happy with how support handled your request, write to our grievance officer. Complaints are acknowledged within {c.acknowledgeWithin} and resolved within {c.resolveWithin}.
            </p>
          </div>
        </div>
        {hasOfficer ? (
          <dl className="mt-5 grid gap-x-6 gap-y-4 rounded-2xl bg-surface p-4 sm:grid-cols-2 sm:p-5">
            {g.name && <Item icon={UserRound} term="Name" value={<>{g.name}{g.designation && <span className="block text-sm font-normal text-muted">{g.designation}</span>}</>} />}
            {g.email && <Item icon={Mail} term="Email" value={<a href={`mailto:${g.email}`} className="break-all font-semibold text-brand-deep underline underline-offset-2">{g.email}</a>} />}
            {g.phone && <Item icon={Phone} term="Phone" value={<a href={`tel:${g.phone.replace(/[^\d+]/g, "")}`} className="font-semibold text-brand-deep underline underline-offset-2">{g.phone}</a>} />}
          </dl>
        ) : (
          <p className="mt-5 rounded-2xl bg-surface p-4 text-sm text-muted">The grievance officer&apos;s details will be listed here. Until then, please use the support contacts above.</p>
        )}
      </section>

      {(c.companyName || c.companyAddress) && (
        <section aria-labelledby="company-title" className="flex items-start gap-3 rounded-3xl bg-white p-5 ring-1 ring-line sm:p-8">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <Building2 aria-hidden className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id="company-title" className="text-lg font-bold text-ink">
              {c.companyName ?? "Registered office"}
            </h2>
            {c.companyAddress && <address className="mt-1 whitespace-pre-line not-italic text-muted">{c.companyAddress}</address>}
          </div>
        </section>
      )}

      <p className="flex items-start gap-2 text-sm text-muted">
        <LifeBuoy aria-hidden className="mt-0.5 size-4 shrink-0" />
        Requests about an order are fastest from the order itself: open it under My orders and choose &quot;Get help&quot;.
      </p>
    </>
  );
}

function Way({ icon: Icon, label, value, href }: { icon: typeof Mail; label: string; value: string; href?: string }) {
  const body = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-deep transition group-hover:bg-brand group-hover:text-ink">
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold uppercase tracking-wide text-muted">{label}</span>
        <span className="block break-words font-semibold text-ink">{value}</span>
      </span>
    </>
  );
  return href ? (
    <a href={href} className="group flex min-h-16 items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-line transition hover:ring-ink">
      {body}
    </a>
  ) : (
    <div className="flex min-h-16 items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-line">{body}</div>
  );
}

function Item({ icon: Icon, term, value }: { icon: typeof Mail; term: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
      <div className="min-w-0">
        <dt className="text-xs font-bold uppercase tracking-wide text-muted">{term}</dt>
        <dd className="mt-0.5 font-semibold text-ink">{value}</dd>
      </div>
    </div>
  );
}
