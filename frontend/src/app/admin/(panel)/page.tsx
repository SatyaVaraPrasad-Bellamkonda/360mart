import { ArrowRight, CheckCircle2, Image as ImageIcon, ExternalLink, FolderTree, ImageOff, Layers, Plus, Star, TextCursorInput, UserRoundPen, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminLoadFailed, PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/components/admin/AdminShell";
import { ADMIN_SECTIONS } from "@/components/admin/sections";
import { Avatar } from "@/components/profile/Avatar";
import { fullName } from "@/lib/auth/current-user";
import { requireRole } from "@/lib/auth/dal";
import { loadCategoryTree } from "@/lib/catalog/data";
import type { CategoryNode } from "@/lib/catalog/types";

export const metadata: Metadata = { title: { absolute: "Admin | 360mart" } };

// The admin home and its menu: who's signed in, the catalogue at a glance,
// what needs fixing, and every section as a tile.
export default function AdminDashboardPage() {
  return (
    <>
      <h1 className="sr-only">Admin dashboard</h1>
      <Suspense fallback={<div aria-hidden className="h-48 animate-pulse rounded-3xl bg-line/60" />}>
        <Welcome />
      </Suspense>
      <Suspense fallback={<div aria-hidden className="h-72 animate-pulse rounded-3xl bg-line/60" />}>
        <Catalogue />
      </Suspense>
      <Sections />
    </>
  );
}

async function Welcome() {
  const user = await requireRole("admin");
  const missing = [!user.firstName && "your name", !user.email && "email", !user.profileImageUrl && "photo"].filter(Boolean) as string[];
  return (
    <section aria-label="Your account" className="relative overflow-hidden rounded-3xl bg-ink p-5 text-white sm:p-8">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-brand/25 blur-3xl motion-safe:animate-drift-a" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-sky-400/15 blur-3xl motion-safe:animate-drift-b" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="shrink-0 rounded-full ring-4 ring-white/10">
          <Avatar user={user} size="lg" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">360mart admin</p>
          <p className="mt-1 break-words text-2xl font-extrabold tracking-tight sm:text-3xl">{user.firstName ? `Welcome back, ${user.firstName}` : "Welcome to the admin panel"}</p>
          <p className="mt-1 text-sm text-white/70">{fullName(user) ? "Run the catalogue and the marketplace from here." : "Add your name so the team knows who made each change."}</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
          <Link href="/admin/profile" className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-ink transition hover:bg-white/90">
            <UserRoundPen aria-hidden className="size-4" />
            {missing.length ? "Complete profile" : "Edit profile"}
          </Link>
        </div>
      </div>
      {missing.length > 0 && (
        <p className="relative mt-5 rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/85">
          Your profile is missing {listOf(missing)}. It takes a minute.
        </p>
      )}
    </section>
  );
}

async function Catalogue() {
  await requireRole("admin");
  const tree = await loadCategoryTree();
  if (!tree.ok) return <AdminLoadFailed message={tree.error.message} />;

  const all = tree.data.flatMap((n) => [n.category, ...n.children]);
  const stats: { icon: LucideIcon; label: string; value: string; tone: string }[] = [
    { icon: FolderTree, label: "Categories", value: String(tree.data.length), tone: "bg-amber-100 text-amber-700" },
    { icon: Layers, label: "Subcategories", value: String(all.length - tree.data.length), tone: "bg-green-100 text-green-700" },
    { icon: Star, label: "Featured", value: String(all.filter((c) => c.isFeatured).length), tone: "bg-violet-100 text-violet-700" },
    { icon: ImageIcon, label: "With pictures", value: `${all.filter((c) => c.imageUrl).length}/${all.length}`, tone: "bg-sky-100 text-sky-700" },
  ];

  return (
    <section aria-labelledby="catalogue-heading" className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
      <div className="rounded-3xl bg-white p-5 ring-1 ring-line sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="catalogue-heading" className="text-lg font-extrabold text-ink">
              Catalogue
            </h2>
            <p className="text-sm text-muted">What shoppers can browse right now.</p>
          </div>
          <a href="/" target="_blank" rel="noopener" className="-my-2 flex min-h-10 items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
            View shop
            <ExternalLink aria-hidden className="size-4" />
          </a>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col rounded-2xl bg-surface p-3 ring-1 ring-line sm:p-4">
              <span aria-hidden className={`flex size-9 items-center justify-center rounded-xl ${s.tone}`}>
                <s.icon className="size-4" />
              </span>
              <dt className="order-last text-xs font-semibold text-muted">{s.label}</dt>
              <dd className="mt-3 text-2xl font-extrabold tabular-nums text-ink">{s.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/admin/categories/new" className={PRIMARY_BUTTON}>
            <Plus aria-hidden className="size-4" />
            Add category
          </Link>
          <Link href="/admin/categories" className={SECONDARY_BUTTON}>
            Open category tree
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </div>
      <Attention tree={tree.data} />
    </section>
  );
}

// A short to-do list a product manager would want: gaps that make shop pages look empty.
function Attention({ tree }: { tree: CategoryNode[] }) {
  const items: { key: string; icon: LucideIcon; text: string; href: string; action: string }[] = [];
  for (const { category, children } of tree) {
    if (children.length === 0) items.push({ key: `subs-${category.categoryId}`, icon: Layers, text: `${category.name} has no subcategories`, href: `/admin/categories/new?parent=${category.categoryId}`, action: "Add" });
    for (const c of [category, ...children]) {
      if (!c.imageUrl) items.push({ key: `img-${c.categoryId}`, icon: ImageOff, text: `${c.name} has no picture`, href: `/admin/categories/${c.categoryId}/edit`, action: "Fix" });
      else if (!c.description) items.push({ key: `desc-${c.categoryId}`, icon: TextCursorInput, text: `${c.name} has no description`, href: `/admin/categories/${c.categoryId}/edit`, action: "Fix" });
    }
  }
  // Most important first: an empty category is an empty shop page; a missing picture or text only looks unfinished.
  const rank = (key: string) => (key.startsWith("subs") ? 0 : key.startsWith("img") ? 1 : 2);
  items.sort((a, b) => rank(a.key) - rank(b.key));
  const shown = items.slice(0, 5);
  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-line sm:p-6">
      <h2 className="text-lg font-extrabold text-ink">Needs attention</h2>
      {tree.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Add your first category to start the shop.</p>
      ) : shown.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-fresh">
          <CheckCircle2 aria-hidden className="size-5" />
          Every category has a picture, a description and subcategories.
        </p>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-line">
            {shown.map((item) => (
              <li key={item.key} className="flex items-center gap-3 py-2">
                <item.icon aria-hidden className="size-4 shrink-0 text-brand-deep" />
                <span className="min-w-0 flex-1 break-words text-sm text-ink">{item.text}</span>
                <Link href={item.href} className="-my-1 flex min-h-10 shrink-0 items-center rounded-full px-3 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
                  {item.action}
                  <span className="sr-only">: {item.text}</span>
                </Link>
              </li>
            ))}
          </ul>
          {items.length > shown.length && <p className="mt-2 text-sm text-muted">And {items.length - shown.length} more.</p>}
        </>
      )}
    </div>
  );
}

function Sections() {
  return (
    <section aria-labelledby="sections-heading" className="space-y-3">
      <h2 id="sections-heading" className="text-lg font-extrabold text-ink">
        Manage
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ADMIN_SECTIONS.map((s) => {
          const body = (
            <>
              <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${s.ready ? s.tone : "bg-surface text-muted ring-1 ring-line"}`}>
                <s.icon aria-hidden className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-bold text-ink">
                  {s.title}
                  {!s.ready && <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-muted ring-1 ring-line">Soon</span>}
                </span>
                <span className="mt-0.5 block text-sm text-muted">{s.text}</span>
              </span>
              {s.ready && <ArrowRight aria-hidden className="size-5 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" />}
            </>
          );
          return (
            <li key={s.href} className="flex">
              {s.ready ? (
                <Link href={s.href} className="group flex w-full items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ink/5 hover:ring-ink/30">
                  {body}
                </Link>
              ) : (
                <div className="flex w-full items-center gap-4 rounded-2xl border border-dashed border-line bg-white/50 p-4 opacity-80">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function listOf(items: string[]): string {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
