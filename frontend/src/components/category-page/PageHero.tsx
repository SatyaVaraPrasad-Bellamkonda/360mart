import { ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { RichText } from "@/components/RichText";
import type { FoodTheme } from "@/lib/catalog/food-theme";
import type { TrustPoint } from "@/lib/category-page/types";
import { TRUST_ICON } from "./icons";

export type HeroStat = { label: string; value: number };

export type HeroContent = {
  headline: string;
  accentLine: string | null;
  intro: string | null;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  imageAlt: string;
  badge: string | null;
  trustPoints: TrustPoint[];
};

// The top of a category page: headline with its coloured second line, intro,
// trust points, the counts the admin chose, and the banner picture (its phone
// version on small screens). Plain markup, so the shop (server) and the page
// editor's live preview (browser) draw exactly the same thing.
export function PageHero({ hero, theme, stats, parent, compact }: { hero: HeroContent; theme: FoodTheme; stats: HeroStat[]; parent?: { name: string; href: string } | null; compact?: boolean }) {
  return (
    <section className={`overflow-hidden rounded-3xl bg-gradient-to-br ring-1 ring-line ${theme.banner}`}>
      <div className={`grid items-center gap-6 p-4 md:grid-cols-[1.05fr_1fr] md:gap-10 ${compact ? "sm:p-6 lg:p-8" : "sm:p-8 lg:p-12"}`}>
        <div className="order-2 min-w-0 md:order-1">
          <div className="flex flex-wrap items-center gap-2">
            {parent && (
              <Link href={parent.href} className={`-my-2 inline-block py-2 text-xs font-bold uppercase tracking-wider hover:underline ${theme.text}`}>
                {parent.name}
              </Link>
            )}
            {hero.badge && (
              <span className={`inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold ring-1 motion-safe:animate-fade-up ${theme.text} ${theme.ring}`}>{hero.badge}</span>
            )}
          </div>
          <h1
            className={`mt-2 break-words font-extrabold leading-tight tracking-tight text-ink motion-safe:animate-fade-up motion-safe:[animation-delay:80ms] ${compact ? "text-3xl sm:text-4xl" : "text-3xl sm:text-4xl lg:text-5xl"}`}
          >
            {hero.headline}
            {hero.accentLine && <span className={`block ${theme.text}`}>{hero.accentLine}</span>}
          </h1>
          {hero.intro && <RichText text={hero.intro} className="mt-3 max-w-lg text-muted motion-safe:animate-fade-up motion-safe:[animation-delay:160ms] sm:text-lg" />}

          {hero.trustPoints.length > 0 && (
            <ul className="mt-5 space-y-2 motion-safe:animate-fade-up motion-safe:[animation-delay:240ms]">
              {hero.trustPoints.map((point, i) => {
                const Icon = TRUST_ICON[point.icon] ?? ShoppingBasket;
                return (
                  <li key={i} className="flex items-center gap-2.5 text-sm font-medium text-ink">
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-full bg-white ring-1 ${theme.text} ${theme.ring}`}>
                      <Icon aria-hidden className="size-4" />
                    </span>
                    <span className="min-w-0 break-words">{point.text}</span>
                  </li>
                );
              })}
            </ul>
          )}

          {stats.length > 0 && (
            <dl
              className="mt-6 grid max-w-md divide-x divide-line rounded-2xl bg-white/80 py-3 text-center ring-1 ring-line motion-safe:animate-fade-up motion-safe:[animation-delay:320ms]"
              style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
            >
              {stats.map((s) => (
                <div key={s.label} className="min-w-0 px-2">
                  <dt className="truncate text-xs text-muted">{s.label}</dt>
                  <dd className="text-xl font-extrabold tabular-nums text-ink">{s.value.toLocaleString("en-IN")}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="relative order-1 md:order-2">
          <div className={`relative overflow-hidden rounded-2xl shadow-xl ${compact ? "aspect-[16/9] md:aspect-[16/10]" : "aspect-[16/10] md:aspect-[4/3]"} ${theme.shadow}`}>
            {hero.imageUrl || hero.mobileImageUrl ? (
              <picture>
                {hero.mobileImageUrl && <source media="(max-width: 767px)" srcSet={hero.mobileImageUrl} />}
                {/* A plain <img>: uploaded pictures are already resized by the backend, and <picture> picks the phone version. */}
                <img
                  src={hero.imageUrl ?? hero.mobileImageUrl ?? undefined}
                  alt={hero.imageAlt}
                  fetchPriority="high"
                  decoding="async"
                  className="absolute inset-0 size-full object-cover motion-safe:animate-ken-burns"
                />
              </picture>
            ) : (
              <div className={`absolute inset-0 flex items-center justify-center ${theme.placeholder}`}>
                <ShoppingBasket aria-hidden className={`size-16 opacity-60 ${theme.text}`} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
