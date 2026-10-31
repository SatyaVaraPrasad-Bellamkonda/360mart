import { ArrowRight, ShoppingBasket } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { RichText } from "@/components/RichText";
import type { FoodTheme } from "@/lib/catalog/food-theme";
import type { HeroAnimation, HeroDisplay, TrustPoint } from "@/lib/category-page/types";
import { HeroPicture } from "./HeroPicture";
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

type Parent = { name: string; href: string } | null;
export type HeroButton = { label: string; href: string } | null;

// Text pieces appear one after another (FADE_UP); literal classes for Tailwind.
const DELAYS = ["", "motion-safe:[animation-delay:80ms]", "motion-safe:[animation-delay:160ms]", "motion-safe:[animation-delay:240ms]", "motion-safe:[animation-delay:320ms]"];

// The photo waits for its file: hidden until it has loaded (HeroPicture sets
// data-ready), then fades or zooms in; photo-late shows it after 2.5 s anyway.
const PHOTO_IN = "motion-safe:animate-photo-late data-[ready]:motion-safe:animate-photo-in";
const PHOTO_ZOOM = "motion-safe:animate-photo-late data-[ready]:motion-safe:animate-zoom-in";
// Slide in: the picture card waits for its photo too, then slides in with it.
const CARD_FROM_LEFT = "motion-safe:animate-photo-late has-[img[data-ready]]:motion-safe:animate-slide-from-left";
const CARD_FROM_RIGHT = "motion-safe:animate-photo-late has-[img[data-ready]]:motion-safe:animate-slide-from-right";

/** The class each part gets for the chosen entrance (all motion-safe: nothing moves with reduced motion). */
function motion(animation: HeroAnimation, imageFirst: boolean) {
  return {
    text: (i: number) => (animation === "FADE_UP" ? `motion-safe:animate-fade-up ${DELAYS[i]}` : ""),
    textBox: animation === "SLIDE_IN" ? (imageFirst ? "motion-safe:animate-slide-from-right" : "motion-safe:animate-slide-from-left") : "",
    frame: animation === "SLIDE_IN" ? (imageFirst ? CARD_FROM_LEFT : CARD_FROM_RIGHT) : "",
    /** The same slide for a card without a photo (nothing to wait for). */
    emptyFrame: animation === "SLIDE_IN" ? (imageFirst ? "motion-safe:animate-slide-from-left" : "motion-safe:animate-slide-from-right") : "",
    image: animation === "SLOW_ZOOM" ? PHOTO_ZOOM : animation === "FADE_UP" ? PHOTO_IN : "",
  };
}

// The top of a category page as the admin set it up: shown or not (then only a
// title line, still the page's H1), picture right / left / behind the text /
// none, large or compact, badge / trust points / counts each on or off, and an
// entrance animation. Plain markup, so the shop (server) and the page editor's
// live preview (browser) draw exactly the same thing. The home page uses it too:
// with a button, its own art (the animated cart) instead of a photo, and as a
// full-width band (`band`) instead of a card.
export function PageHero({
  hero,
  display,
  theme,
  stats,
  parent,
  button,
  art,
  band,
}: {
  hero: HeroContent;
  display: HeroDisplay;
  theme: FoodTheme;
  stats: HeroStat[];
  parent?: Parent;
  button?: HeroButton;
  /** Drawn instead of the photo on the side layouts. */
  art?: ReactNode;
  band?: boolean;
}) {
  if (!display.enabled) return <TitleOnly headline={hero.headline} theme={theme} parent={parent ?? null} band={band} />;

  const compact = display.size === "COMPACT";
  const content: HeroContent = { ...hero, badge: display.showBadge ? hero.badge : null, trustPoints: display.showTrustPoints ? hero.trustPoints : [] };
  const shown = display.showStats ? stats : [];
  const layout = display.layout;
  const m = motion(display.animation, layout === "IMAGE_LEFT");
  const text = (dark: boolean, inline = false) => <HeroText hero={content} theme={theme} stats={shown} parent={parent ?? null} button={button ?? null} compact={compact} dark={dark} inlinePoints={inline} rise={m.text} />;
  // A card in the page, or a band across the whole width with the content in the page column.
  const shell = band ? "" : "rounded-3xl ring-1 ring-line";
  const column = band ? `mx-auto w-full max-w-6xl px-4 ${compact ? "py-8 md:py-10" : "py-10 md:py-16"}` : "";

  if (layout === "IMAGE_BACKGROUND") {
    const hasPicture = !!(hero.imageUrl || hero.mobileImageUrl);
    return (
      <section className={`relative isolate flex overflow-hidden ${shell} ${hasPicture ? "bg-ink" : theme.solid} ${compact ? "min-h-[320px] md:min-h-[340px]" : "min-h-[460px] md:min-h-[500px]"}`}>
        {hasPicture && (
          // The photo itself never slides here (it would bare an edge): only the text does.
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <HeroPicture hero={hero} className={display.animation === "SLIDE_IN" ? PHOTO_IN : m.image} />
          </div>
        )}
        {/* Darker where the text sits, so it stays readable on any photo. */}
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/45 to-black/5 md:bg-gradient-to-r md:from-black/80 md:via-black/45 md:to-transparent" />
        {band ? (
          <div className={`mt-auto md:my-auto ${column}`}>
            <div className={`max-w-xl ${m.textBox}`}>{text(true)}</div>
          </div>
        ) : (
          <div className={`mt-auto w-full max-w-xl p-5 md:my-auto ${compact ? "sm:p-6 lg:p-8" : "sm:p-8 lg:p-12"} ${m.textBox}`}>{text(true)}</div>
        )}
      </section>
    );
  }

  if (layout === "TEXT_ONLY") {
    return (
      <section className={`relative isolate overflow-hidden bg-gradient-to-br ${shell} ${theme.banner}`}>
        <div aria-hidden className={`absolute -right-20 -top-24 -z-10 size-72 rounded-full opacity-70 blur-3xl ${theme.soft}`} />
        <div aria-hidden className={`absolute -bottom-24 left-1/3 -z-10 size-56 rounded-full opacity-50 blur-3xl ${theme.soft}`} />
        <div className={column}>
          <div className={`max-w-3xl ${band ? "" : `p-5 ${compact ? "sm:p-6 lg:p-8" : "sm:p-10 lg:p-14"}`} ${m.textBox}`}>{text(false, true)}</div>
        </div>
      </section>
    );
  }

  const left = layout === "IMAGE_LEFT";
  return (
    <section className={`overflow-hidden bg-gradient-to-br ${shell} ${theme.banner}`}>
      <div
        className={`grid items-center gap-6 md:gap-10 ${left ? "md:grid-cols-[1fr_1.05fr]" : "md:grid-cols-[1.05fr_1fr]"} ${band ? column : `p-4 ${compact ? "sm:p-6 lg:p-8" : "sm:p-8 lg:p-12"}`}`}
      >
        {/* Phones: a photo leads; the art (the cart) comes after the words. */}
        <div className={`min-w-0 ${art ? "order-1" : "order-2"} ${left ? "md:order-2" : "md:order-1"} ${m.textBox}`}>{text(false)}</div>
        {art ? (
          <div className={`relative order-2 ${left ? "md:order-1" : "md:order-2"} ${m.emptyFrame}`}>{art}</div>
        ) : (
        <div className={`relative order-1 ${left ? "md:order-1" : "md:order-2"} ${hero.imageUrl || hero.mobileImageUrl ? m.frame : m.emptyFrame}`}>
          <div className={`relative overflow-hidden rounded-2xl shadow-xl ${compact ? "aspect-[2/1] md:aspect-[16/10]" : "aspect-[16/10] md:aspect-[4/3]"} ${theme.shadow} ${theme.placeholder}`}>
            {hero.imageUrl || hero.mobileImageUrl ? (
              <HeroPicture hero={hero} className={m.image} />
            ) : (
              <div className={`absolute inset-0 flex items-center justify-center ${theme.placeholder}`}>
                <ShoppingBasket aria-hidden className={`size-16 opacity-60 ${theme.text}`} />
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </section>
  );
}

function HeroText({
  hero,
  theme,
  stats,
  parent,
  button,
  compact,
  dark,
  inlinePoints,
  rise,
}: {
  hero: HeroContent;
  theme: FoodTheme;
  stats: HeroStat[];
  parent: Parent;
  button: HeroButton;
  compact: boolean;
  dark: boolean;
  inlinePoints: boolean;
  rise: (i: number) => string;
}) {
  return (
    <>
      {(parent || hero.badge) && (
        <div className="flex flex-wrap items-center gap-2">
          {parent && (
            <Link href={parent.href} className={`-my-2 inline-block py-2 text-xs font-bold uppercase tracking-wider hover:underline ${dark ? "text-white" : theme.text}`}>
              {parent.name}
            </Link>
          )}
          {hero.badge && <span className={`inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold ring-1 ${theme.text} ${theme.ring} ${rise(0)}`}>{hero.badge}</span>}
        </div>
      )}
      <h1
        className={`mt-2 break-words font-extrabold leading-tight tracking-tight ${dark ? "text-white" : "text-ink"} ${compact ? "text-3xl sm:text-4xl" : "text-3xl sm:text-4xl lg:text-5xl"} ${rise(1)}`}
      >
        {hero.headline}
        {hero.accentLine && <span className={`block ${dark ? "text-white/80" : theme.text}`}>{hero.accentLine}</span>}
      </h1>
      {hero.intro && <RichText text={hero.intro} className={`mt-3 max-w-lg sm:text-lg ${dark ? "text-white/85 [&_strong]:text-white" : "text-muted"} ${rise(2)}`} />}

      {hero.trustPoints.length > 0 && (
        <ul className={`mt-5 ${inlinePoints ? "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6" : "space-y-2"} ${rise(3)}`}>
          {hero.trustPoints.map((point, i) => {
            const Icon = TRUST_ICON[point.icon] ?? ShoppingBasket;
            return (
              <li key={i} className={`flex items-center gap-2.5 text-sm font-medium ${dark ? "text-white" : "text-ink"}`}>
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ring-1 ${dark ? "bg-white/15 text-white ring-white/30" : `bg-white ${theme.text} ${theme.ring}`}`}>
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
          className={`mt-6 grid max-w-md divide-x divide-line rounded-2xl py-3 text-center ring-1 ring-line ${dark ? "bg-white/95" : "bg-white/80"} ${rise(4)}`}
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

      {button && (
        <Link
          href={button.href}
          className={`mt-7 inline-flex min-h-12 items-center gap-2 rounded-full px-6 font-semibold shadow-lg transition hover:gap-3 ${dark ? "bg-white text-ink shadow-black/20 hover:bg-white/90" : "bg-ink text-white shadow-ink/25 hover:bg-ink/85"} ${rise(4)}`}
        >
          {button.label}
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      )}
    </>
  );
}

// The hero switched off: the page still has its one H1 (and the parent link on subcategory pages).
function TitleOnly({ headline, theme, parent, band }: { headline: string; theme: FoodTheme; parent: Parent; band?: boolean }) {
  return (
    <header className={band ? "mx-auto max-w-6xl px-4 pt-8" : ""}>
      {parent && (
        <Link href={parent.href} className={`-my-2 inline-block py-2 text-xs font-bold uppercase tracking-wider hover:underline ${theme.text}`}>
          {parent.name}
        </Link>
      )}
      <h1 className="break-words text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{headline}</h1>
      <span aria-hidden className={`mt-2 block h-1 w-12 rounded-full ${theme.solid}`} />
    </header>
  );
}
