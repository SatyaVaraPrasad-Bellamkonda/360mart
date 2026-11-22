"use client";

import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { HeroVisual } from "@/components/HeroVisual";
import { RichText } from "@/components/RichText";
import { HOME_DEFAULTS, type HeroBackground, type HeroSideCardView, type HeroSlideView, type HomeHeroView } from "@/lib/home-page/types";

// The home banner: 1–5 slides (photo, silent looping video, the animated cart,
// or a colour) with text over them, as the admin set it up, plus an optional
// side card. Slides swipe (native scroll snap), move on their own with a
// progress line on the current dot, pause on hover / focus / touch / a hidden
// tab and with the pause button, and never move for reduced motion. Videos load
// only for the slide on screen, never with data saver, and not on phones when
// the admin says so (the poster shows instead). The first slide's headline is
// the page's one H1. Shared by the shop and the designer's live preview
// (`showSlide` pins one slide and stops the movement).

export function HomeHero({ hero, showSlide }: { hero: HomeHeroView; showSlide?: number }) {
  const slides = hero.slides;
  // Banner off (or nothing scheduled now): the page starts with its sections; the H1 stays for Google.
  if (!hero.enabled || slides.length === 0) return <h1 className="sr-only">{HOME_DEFAULTS.headline} {HOME_DEFAULTS.accentLine}</h1>;

  const card = hero.frame === "CARD";
  const banner = <Carousel hero={hero} showSlide={showSlide} card={card} />;
  return (
    <div className={card ? "mx-auto w-full max-w-page px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8" : "w-full"}>
      {hero.sideCard ? (
        <div className={`grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] ${card ? "" : "mx-auto max-w-page px-4 pt-4 sm:px-6 lg:px-8"}`}>
          {banner}
          <SideCard card={hero.sideCard} />
        </div>
      ) : (
        banner
      )}
    </div>
  );
}

// ---- the slider ----

// Desktop heights; phones use the admin's shape instead (with a floor, so the words always fit).
const HEIGHT = { COMPACT: "md:h-[340px]", MEDIUM: "md:h-[440px]", TALL: "md:h-[560px]" } as const;
const SHAPE = { SQUARE: "aspect-square min-h-[340px]", PORTRAIT: "aspect-[4/5] min-h-[380px]", WIDE: "aspect-video min-h-[300px]" } as const;

function Carousel({ hero, showSlide, card }: { hero: HomeHeroView; showSlide?: number; card: boolean }) {
  const slides = hero.slides;
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false); // the pause button
  const [held, setHeld] = useState(false); // hover, focus or a finger on it
  const visible = useSyncExternalStore(pageVisibility.subscribe, pageVisibility.get, () => true);
  const calm = useSyncExternalStore(reducedMotion.subscribe, reducedMotion.get, () => true);
  const many = slides.length > 1;
  const pinned = showSlide !== undefined;
  const moving = many && hero.autoplay && !pinned && !paused && !held && visible && !calm;

  const go = useCallback((to: number, smooth = true) => {
    const el = track.current;
    if (!el) return;
    const next = (to + slides.length) % slides.length;
    el.scrollTo({ left: next * el.clientWidth, behavior: smooth && !reducedMotion.get() ? "smooth" : "auto" });
  }, [slides.length]);

  // The current slide follows the scroll position (swipes included).
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // The designer pins the slide being edited.
  useEffect(() => {
    if (pinned) go(Math.min(showSlide, slides.length - 1), false);
  }, [pinned, showSlide, slides.length, go]);

  // Moving on: one timer per slide, restarted whenever it's shown again.
  useEffect(() => {
    if (!moving) return;
    const timer = setTimeout(() => go(index + 1), hero.intervalSeconds * 1000);
    return () => clearTimeout(timer);
  }, [moving, index, hero.intervalSeconds, go]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Highlights"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setHeld(false)}
      onTouchStart={() => setHeld(true)}
      onTouchEnd={() => setHeld(false)}
      className={`group/hero @container relative isolate overflow-hidden bg-ink ${card ? "rounded-[28px] shadow-[0_24px_60px_-28px_rgb(15_23_42/0.45)]" : ""} ${HEIGHT[hero.height]}`}
    >
      <div ref={track} className={`flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${pinned ? "pointer-events-none" : ""}`}>
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}`}
            aria-hidden={i !== index || undefined}
            inert={i !== index || undefined}
            className={`relative h-full w-full shrink-0 snap-center ${SHAPE[hero.mobileShape]} md:aspect-auto md:min-h-0`}
          >
            <Slide slide={slide} first={i === 0} active={i === index} card={card} height={hero.height} />
          </div>
        ))}
      </div>

      {many && !pinned && (
        <div className="pointer-events-none absolute bottom-0 right-0 z-10 flex items-center gap-2 pb-3 pr-3 sm:pb-5 sm:pr-5">
          <div className="pointer-events-auto flex items-center rounded-full bg-black/25 px-1.5 backdrop-blur-md">
            {slides.map((s, i) => (
              <button key={s.id} type="button" onClick={() => go(i)} aria-label={`Show slide ${i + 1}`} aria-current={i === index || undefined} className="flex h-10 items-center px-1">
                <span className={`relative block h-1.5 overflow-hidden rounded-full transition-all duration-500 ${i === index ? "w-8 bg-white/35" : "w-1.5 bg-white/60 hover:bg-white"}`}>
                  {i === index && (
                    <span
                      key={`${index}-${moving}`}
                      className={`absolute inset-y-0 left-0 rounded-full bg-white ${moving ? "animate-[hero-progress_linear_forwards]" : "w-full"}`}
                      style={moving ? ({ animationDuration: `${hero.intervalSeconds}s` } as CSSProperties) : undefined}
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            {hero.autoplay && !calm && (
              <GlassButton label={paused ? "Play the slides" : "Pause the slides"} onClick={() => setPaused((p) => !p)}>
                {paused ? <Play aria-hidden className="size-4" /> : <Pause aria-hidden className="size-4" />}
              </GlassButton>
            )}
            <span className="hidden gap-2 sm:flex">
              <GlassButton label="Previous slide" onClick={() => go(index - 1)}>
                <ChevronLeft aria-hidden className="size-5" />
              </GlassButton>
              <GlassButton label="Next slide" onClick={() => go(index + 1)}>
                <ChevronRight aria-hidden className="size-5" />
              </GlassButton>
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

function GlassButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="flex size-10 items-center justify-center rounded-full bg-black/25 text-white ring-1 ring-white/20 backdrop-blur-md transition hover:bg-black/40 active:scale-95">
      {children}
    </button>
  );
}

// ---- one slide ----

// Colour backgrounds (and the cart's): literal classes, light ones get dark words by default.
const BACKGROUND: Record<HeroBackground, string> = {
  AMBER: "bg-[radial-gradient(120%_120%_at_85%_10%,#fde68a_0%,#f59e0b_45%,#d97706_100%)]",
  INK: "bg-[radial-gradient(120%_120%_at_85%_0%,#334155_0%,#0f172a_55%,#020617_100%)]",
  FOREST: "bg-[radial-gradient(120%_120%_at_85%_0%,#10b981_0%,#065f46_50%,#022c22_100%)]",
  BERRY: "bg-[radial-gradient(120%_120%_at_85%_0%,#f472b6_0%,#9d174d_50%,#4a0620_100%)]",
  SKY: "bg-[radial-gradient(120%_120%_at_85%_0%,#ffffff_0%,#e0f2fe_40%,#7dd3fc_100%)]",
  SAND: "bg-[radial-gradient(120%_120%_at_85%_0%,#ffffff_0%,#fef3c7_45%,#fde68a_100%)]",
};
const FOCUS = { CENTER: "object-center", LEFT: "object-left", RIGHT: "object-right", TOP: "object-top", BOTTOM: "object-bottom" } as const;
// "-safe": content taller than the banner starts at the top instead of escaping above it.
const PLACE = {
  LEFT: "items-center-safe justify-start text-left",
  CENTER: "items-center-safe justify-center-safe text-center",
  BOTTOM_LEFT: "items-end-safe justify-start text-left",
} as const;

// Words scale with the banner's desktop height (phones use the base sizes: their shape is set separately);
// a narrow banner (beside the side card on a laptop) gives a cart slide's words more of its width.
// Sizes follow the banner's own width (@container), so a side card shrinks them too.
const TYPE = {
  COMPACT: {
    pad: "md:py-6",
    badge: "md:mb-2.5 md:py-1 md:text-xs",
    head: "md:text-[1.75rem] @2xl:text-[2.25rem] @5xl:text-[2.5rem]",
    intro: "line-clamp-2 @2xl:text-base",
    buttons: "md:mt-4",
    button: "md:min-h-11 md:px-5",
  },
  MEDIUM: {
    pad: "md:py-8 @5xl:py-10",
    badge: "",
    head: "@lg:text-[2.25rem] @3xl:text-[2.5rem] @5xl:text-5xl",
    intro: "line-clamp-3 @2xl:text-lg",
    buttons: "md:mt-6",
    button: "",
  },
  TALL: {
    pad: "md:py-12",
    badge: "",
    head: "@lg:text-[2.5rem] @2xl:text-5xl @5xl:text-6xl",
    intro: "line-clamp-3 @2xl:text-lg",
    buttons: "sm:mt-8",
    button: "",
  },
} as const;
type Height = keyof typeof TYPE;

function Slide({ slide, first, active, card, height }: { slide: HeroSlideView; first: boolean; active: boolean; card: boolean; height: Height }) {
  const light = slide.textTone === "LIGHT";
  const cart = slide.kind === "CART";
  const media = slide.kind === "PHOTO" || slide.kind === "VIDEO";
  // A photo or video can go without words: then no shade and no text block, just the media.
  const words = !!(slide.headline || slide.accentLine || slide.intro || slide.badge || (slide.buttonLabel && slide.buttonLink) || (slide.secondaryLabel && slide.secondaryLink));
  return (
    <div className={`absolute inset-0 overflow-hidden ${media ? "bg-ink" : BACKGROUND[slide.background]}`}>
      {media && <Media slide={slide} first={first} active={active} />}
      {media && words && <Overlay slide={slide} />}
      {/* The page keeps its one H1 even when the first slide has no headline (for Google and screen readers). */}
      {first && !slide.headline && <h1 className="sr-only">{slide.imageAlt || `${HOME_DEFAULTS.headline} ${HOME_DEFAULTS.accentLine}`}</h1>}
      {!media && <Glow light={light} />}

      <div className={`relative z-[1] mx-auto flex h-full w-full ${card ? "" : "max-w-page"} ${cart ? "flex-col justify-center-safe md:flex-row md:items-center-safe" : PLACE[slide.textPosition]}`}>
        {(words || cart) && <div className={`flex min-w-0 flex-col px-6 pb-16 pt-8 sm:px-10 sm:pb-20 md:px-8 @3xl:px-12 @5xl:px-14 ${TYPE[height].pad} ${slide.textPosition === "BOTTOM_LEFT" && !cart ? "md:pb-16" : ""} ${cart ? "md:w-[64%] @3xl:w-[56%]" : "max-w-2xl"} ${slide.textPosition === "CENTER" && !cart ? "items-center" : "items-start"}`}>
          <Words slide={slide} first={first} light={light} active={active} size={TYPE[height]} />
        </div>}
        {cart && (
          <div aria-hidden={!active} className="pointer-events-none hidden w-full max-w-[17rem] self-center px-6 pb-14 min-[420px]:block md:mt-0 md:w-[36%] md:max-w-none md:pb-0 md:pl-0 md:pr-6 @3xl:w-[44%] @3xl:pr-10">
            <HeroVisual labels={slide.floatingLabels} alt={slide.imageAlt || HOME_DEFAULTS.imageAlt} compact />
          </div>
        )}
      </div>
    </div>
  );
}

function Words({ slide, first, light, active, size }: { slide: HeroSlideView; first: boolean; light: boolean; active: boolean; size: (typeof TYPE)[Height] }) {
  const Heading = first ? "h1" : "h2";
  const enter = active ? "motion-safe:animate-fade-up" : "";
  return (
    <>
      {slide.badge && (
        <p className={`mb-4 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold tracking-wide backdrop-blur-md sm:text-sm ${size.badge} ${light ? "bg-white/15 text-white ring-1 ring-white/25" : "bg-white/70 text-ink ring-1 ring-ink/10"} ${enter}`}>
          <span aria-hidden className={`size-1.5 rounded-full ${light ? "bg-amber-300" : "bg-[#ea6a0a]"}`} />
          {slide.badge}
        </p>
      )}
      {(slide.headline || slide.accentLine) && (
        <Heading className={`text-balance text-[2rem] font-extrabold leading-[1.02] tracking-[-0.035em] ${size.head} ${light ? "text-white" : "text-ink"} ${enter}`}>
          {slide.headline}
          {slide.accentLine && <span className={`block ${light ? "text-amber-300" : "text-brand-deep"}`}>{slide.accentLine}</span>}
        </Heading>
      )}
      {slide.intro && (
        <div className={`mt-3 max-w-xl text-pretty text-[15px] leading-relaxed md:mt-4 ${size.intro} ${light ? "text-white/85" : "text-ink/70"} ${enter}`}>
          <RichText text={slide.intro} />
        </div>
      )}
      {(slide.buttonLabel || slide.secondaryLabel) && (
        <div className={`mt-6 flex flex-wrap items-center gap-3 ${size.buttons} ${enter}`}>
          {slide.buttonLabel && slide.buttonLink && (
            <Link href={slide.buttonLink} className={`group/btn inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-[15px] font-bold shadow-lg transition active:scale-[0.98] ${size.button} ${light ? "bg-white text-ink shadow-black/20 hover:bg-amber-50" : "bg-ink text-white shadow-ink/20 hover:bg-ink/90"}`}>
              {slide.buttonLabel}
              <ArrowRight aria-hidden className="size-4 transition group-hover/btn:translate-x-0.5" />
            </Link>
          )}
          {slide.secondaryLabel && slide.secondaryLink && (
            <Link href={slide.secondaryLink} className={`inline-flex min-h-12 items-center rounded-full px-5 text-[15px] font-semibold ring-1 backdrop-blur-md transition ${size.button} ${light ? "text-white ring-white/40 hover:bg-white/10" : "text-ink ring-ink/20 hover:bg-ink/5"}`}>
              {slide.secondaryLabel}
            </Link>
          )}
        </div>
      )}
    </>
  );
}

// A photo (its own phone picture under 768px) or a silent looping video over its poster.
function Media({ slide, first, active }: { slide: HeroSlideView; first: boolean; active: boolean }) {
  const poster = slide.kind === "VIDEO" ? slide.posterUrl || slide.imageUrl : slide.imageUrl;
  const phonePoster = slide.mobileImageUrl;
  const fit = `absolute inset-0 h-full w-full object-cover ${FOCUS[slide.focus]}`;
  return (
    <>
      {poster && (
        <picture>
          {phonePoster && <source media="(max-width: 767px)" srcSet={phonePoster} />}
          {/* Plain <img> inside <picture> (the rule allows it): permanent storage links, already sized by the backend. */}
          <img src={poster} alt={slide.imageAlt || ""} className={fit} loading={first ? "eager" : "lazy"} fetchPriority={first ? "high" : "low"} decoding="async" />
        </picture>
      )}
      {slide.kind === "VIDEO" && <HeroVideo slide={slide} active={active} className={fit} />}
    </>
  );
}

function HeroVideo({ slide, active, className }: { slide: HeroSlideView; active: boolean; className: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const phone = useSyncExternalStore(narrow.subscribe, narrow.get, () => false);
  const calm = useSyncExternalStore(reducedMotion.subscribe, reducedMotion.get, () => true);
  const saving = useSyncExternalStore(noop, saveData, () => true);
  const [ready, setReady] = useState(false);
  const [played, setPlayed] = useState(false); // reduced motion: only after a tap
  const src = phone ? (slide.videoOnPhones ? slide.mobileVideoUrl || slide.videoUrl : null) : slide.videoUrl;
  const allowed = !!src && !saving && (!calm || played);

  // Plays only while its slide is on screen; the file isn't even requested before that.
  useEffect(() => {
    const video = ref.current;
    if (!video || !allowed) return;
    if (active) void video.play().catch(() => undefined);
    else video.pause();
  }, [active, allowed, src]);

  if (!src || saving) return null;
  if (calm && !played) {
    return (
      <button type="button" onClick={() => setPlayed(true)} aria-label="Play the video" className="absolute right-4 top-4 z-[2] flex size-11 items-center justify-center rounded-full bg-black/35 text-white ring-1 ring-white/25 backdrop-blur-md">
        <Play aria-hidden className="size-5" />
      </button>
    );
  }
  return (
    <video
      ref={ref}
      key={src}
      src={active || ready ? src : undefined}
      muted
      loop
      playsInline
      autoPlay={active}
      preload="none"
      aria-hidden
      tabIndex={-1}
      onCanPlay={() => setReady(true)}
      className={`${className} transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
    />
  );
}

// The shade that keeps words readable: black under light words, white under dark ones.
function Overlay({ slide }: { slide: HeroSlideView }) {
  if (slide.overlay === "NONE" || slide.overlayStrength <= 0) return null;
  const a = slide.overlayStrength / 100;
  const c = slide.textTone === "LIGHT" ? "2 6 23" : "255 255 255";
  const background =
    slide.overlay === "LEFT_FADE"
      ? `linear-gradient(90deg, rgb(${c} / ${a}) 0%, rgb(${c} / ${a * 0.75}) 35%, rgb(${c} / 0) 75%)`
      : slide.overlay === "BOTTOM_FADE"
        ? `linear-gradient(0deg, rgb(${c} / ${a}) 0%, rgb(${c} / ${a * 0.6}) 40%, rgb(${c} / 0) 80%)`
        : `rgb(${c} / ${a})`;
  return <div aria-hidden className="absolute inset-0" style={{ background }} />;
}

// Soft light on colour and cart slides, so they don't look flat.
function Glow({ light }: { light: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className={`absolute -right-24 -top-24 size-96 rounded-full blur-3xl ${light ? "bg-amber-300/25" : "bg-white/50"}`} />
      <div className={`absolute -bottom-32 left-1/4 size-80 rounded-full blur-3xl ${light ? "bg-fuchsia-400/15" : "bg-amber-200/40"}`} />
      <div className={`absolute inset-0 opacity-[0.06] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:18px_18px] ${light ? "text-white" : "text-ink"}`} />
    </div>
  );
}

// ---- side card ----

const TONE = {
  PEACH: "bg-[#ffe7d9] ring-[#f9d3bc]",
  MINT: "bg-[#dcf5e8] ring-[#bfe8d2]",
  SKY: "bg-[#e0effe] ring-[#c5ddf7]",
  SAND: "bg-[#fbf0d9] ring-[#f1dfb8]",
} as const;

function SideCard({ card }: { card: HeroSideCardView }) {
  return (
    <Link href={card.linkPath} className={`group/card flex items-center gap-4 rounded-[28px] p-3 ring-1 transition hover:-translate-y-0.5 hover:shadow-xl sm:p-4 lg:flex-col lg:items-stretch lg:p-5 ${TONE[card.tone]}`}>
      {card.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.imageUrl} alt="" loading="lazy" decoding="async" className="aspect-square w-24 shrink-0 rounded-2xl object-cover sm:aspect-[4/3] sm:w-44 lg:aspect-auto lg:min-h-0 lg:w-full lg:flex-1" />
      )}
      <div className="flex min-w-0 flex-1 items-end gap-3 lg:flex-none">
        <div className="min-w-0 flex-1">
          {card.eyebrow && <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#b45309]">{card.eyebrow}</p>}
          <p className="mt-0.5 text-lg font-extrabold leading-tight tracking-tight text-ink sm:text-2xl">{card.title}</p>
          {card.text && <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink/70 lg:line-clamp-3">{card.text}</p>}
        </div>
        <span aria-hidden className="hidden size-11 shrink-0 items-center justify-center rounded-full bg-ink text-white transition group-hover/card:translate-x-0.5 min-[420px]:flex">
          <ArrowRight className="size-5" />
        </span>
      </div>
    </Link>
  );
}

// ---- browser facts, read without a hydration mismatch ----

const noop = () => () => {};
function media(query: string) {
  return {
    subscribe: (cb: () => void) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    get: () => window.matchMedia(query).matches,
  };
}
const reducedMotion = media("(prefers-reduced-motion: reduce)");
const narrow = media("(max-width: 767px)");
const pageVisibility = {
  subscribe: (cb: () => void) => {
    document.addEventListener("visibilitychange", cb);
    return () => document.removeEventListener("visibilitychange", cb);
  },
  get: () => document.visibilityState === "visible",
};
/** Data saver on, or a 2G-class connection: posters only. */
function saveData(): boolean {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !!c && (c.saveData === true || /(^|-)2g$/.test(c.effectiveType ?? ""));
}
