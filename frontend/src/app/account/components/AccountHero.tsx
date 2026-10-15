import { BadgeCheck, Camera, Mail, Pencil, Phone } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/profile/Avatar";
import { fullName, type CurrentUser } from "@/lib/auth/current-user";
import { formatMobile } from "@/lib/auth/validation";

// Top of /account: who you are, at a glance, with the way to change it.
export function AccountHero({ user }: { user: CurrentUser }) {
  const name = fullName(user);

  return (
    <section
      aria-labelledby="account-title"
      className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 ring-1 ring-brand/20 motion-safe:animate-fade-up"
    >
      <BannerBackground />

      <div className="flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:p-8 sm:text-left">
        <Link
          href="/account/profile"
          aria-label="Change profile photo"
          className="group relative shrink-0 rounded-full shadow-lg shadow-brand/20 ring-4 ring-white transition duration-500 hover:ring-brand/40"
        >
          <Avatar user={user} size="lg" />
          <span className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full bg-brand text-ink ring-4 ring-white transition duration-500 group-hover:scale-110">
            <Camera aria-hidden className="size-4" />
          </span>
        </Link>

        <div className="min-w-0 flex-1">
          <h1 id="account-title" className="text-xs font-bold uppercase tracking-[0.2em] text-brand-deep">
            My account
          </h1>
          <p className="mt-1 truncate text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{name ?? "Welcome to 360mart"}</p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2 text-sm text-ink sm:justify-start">
            <li className="flex min-h-8 items-center gap-1.5 rounded-full bg-white/70 px-3 ring-1 ring-white backdrop-blur">
              <Phone aria-hidden className="size-3.5 text-muted" />
              {formatMobile(user.mobileNumber)}
              {user.mobileVerified && (
                <span className="flex items-center text-fresh">
                  <BadgeCheck aria-hidden className="size-4" />
                  <span className="sr-only">(verified)</span>
                </span>
              )}
            </li>
            <li className="flex min-h-8 min-w-0 items-center gap-1.5 rounded-full bg-white/70 px-3 ring-1 ring-white backdrop-blur">
              <Mail aria-hidden className="size-3.5 shrink-0 text-muted" />
              {user.email ? <span className="truncate">{user.email}</span> : <span className="text-muted">No email added</span>}
            </li>
          </ul>
        </div>

        <Link
          href="/account/profile"
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white shadow-md shadow-ink/10 transition duration-500 hover:bg-ink/85"
        >
          <Pencil aria-hidden className="size-4" />
          Edit profile
        </Link>
      </div>
    </section>
  );
}

// Soft, slowly drifting colour glows behind the banner content. Decorative
// only: hidden from screen readers and still (just the colours) when the
// device asks for reduced motion.
function BannerBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute -left-16 -top-24 size-72 rounded-full bg-amber-200/60 blur-3xl will-change-transform motion-safe:animate-drift-a" />
      <div className="absolute -right-10 -top-16 size-80 rounded-full bg-rose-200/50 blur-3xl will-change-transform motion-safe:animate-drift-b" />
      <div className="absolute -bottom-32 left-1/3 size-80 rounded-full bg-orange-200/50 blur-3xl will-change-transform motion-safe:animate-drift-c" />
      <div className="absolute -bottom-24 -right-16 size-64 rounded-full bg-sky-100/70 blur-3xl will-change-transform motion-safe:animate-drift-a [animation-delay:-13s]" />
      {/* light sheen */}
      <div className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/40 to-transparent motion-safe:animate-sheen motion-reduce:hidden" />
    </div>
  );
}
