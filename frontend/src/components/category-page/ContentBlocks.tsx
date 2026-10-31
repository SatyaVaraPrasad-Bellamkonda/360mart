import { ArrowRight, ChevronDown, ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { RichText } from "@/components/RichText";
import { SectionHeading } from "@/components/SectionHeading";
import type { FoodTheme } from "@/lib/catalog/food-theme";
import type { FaqPageSection, PromoBannerSection, SectionImage, TextBlockSection, TrustStripSection } from "@/lib/category-page/types";
import { TRUST_ICON } from "./icons";

// The admin's content sections on a category page: offer banner, text block,
// trust strip and questions. Plain markup (no browser code), shared by the shop
// and the editor's previews. `id` is the heading id the section is labelled by.

/** A wide picture with a headline; with a link the whole banner is the link (a big tap target on phones). */
export function PromoBanner({ section: s, image, id }: { section: PromoBannerSection; image: SectionImage | null; id: string }) {
  const titled = !!s.title?.trim();
  const Headline = titled ? "h3" : "h2";
  const link = s.linkPath?.trim();
  const label = s.buttonLabel?.trim();
  const body = (
    <>
      {image?.imageUrl || image?.mobileImageUrl ? (
        <picture>
          {image.mobileImageUrl && <source media="(max-width: 639px)" srcSet={image.mobileImageUrl} />}
          {/* Already resized by the backend (≤ 1600 px); lazy, it's below the hero. */}
          <img
            src={image.imageUrl ?? image.mobileImageUrl ?? undefined}
            alt={s.imageAlt?.trim() || ""}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 -z-10 size-full object-cover transition duration-700 group-hover:scale-105"
          />
        </picture>
      ) : (
        <div className="absolute inset-0 -z-10 flex items-center justify-center bg-gradient-to-br from-slate-500 to-slate-700">
          <ShoppingBasket aria-hidden className="size-14 text-white/40" />
        </div>
      )}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/35 to-transparent sm:bg-gradient-to-r sm:from-black/75 sm:via-black/35 sm:to-transparent" />
      <div className="mt-auto max-w-lg p-5 sm:my-auto sm:p-8 lg:p-10">
        <Headline id={titled ? undefined : id} className="break-words text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
          {s.headline}
        </Headline>
        {s.text?.trim() && <p className="mt-2 break-words text-sm text-white/85 sm:text-base">{s.text}</p>}
        {link && label && (
          <span className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-ink shadow-sm transition group-hover:gap-3">
            {label}
            <ArrowRight aria-hidden className="size-4" />
          </span>
        )}
      </div>
    </>
  );
  const box = "group relative isolate flex aspect-[4/3] overflow-hidden rounded-3xl bg-ink ring-1 ring-line sm:aspect-[21/9] lg:aspect-[16/5]";
  return (
    <>
      {titled && <SectionHeading id={id} title={s.title!.trim()} subtitle={s.subtitle?.trim() || undefined} />}
      {link ? (
        <Link href={link} className={`${box} focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/50`}>
          {body}
        </Link>
      ) : (
        <div className={box}>{body}</div>
      )}
    </>
  );
}

/** A heading and formatted text (guides, storage tips), with an accent bar in the page colour. */
export function TextBlock({ section: s, theme, id }: { section: TextBlockSection; theme: FoodTheme; id: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-white p-5 ring-1 ring-line sm:p-8">
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${theme.solid}`} />
      {s.title?.trim() ? (
        <SectionHeading id={id} title={s.title.trim()} subtitle={s.subtitle?.trim() || undefined} />
      ) : (
        <h2 id={id} className="sr-only">
          More information
        </h2>
      )}
      <RichText text={s.body} className="max-w-3xl leading-relaxed text-muted sm:text-lg" />
    </div>
  );
}

/** Short promises with icons: two across on phones, all in one row on bigger screens. */
export function TrustStrip({ section: s, theme, id }: { section: TrustStripSection; theme: FoodTheme; id: string }) {
  const cols = s.points.length === 4 ? "lg:grid-cols-4" : s.points.length === 3 ? "lg:grid-cols-3" : "";
  return (
    <>
      {s.title?.trim() ? (
        <SectionHeading id={id} title={s.title.trim()} subtitle={s.subtitle?.trim() || undefined} />
      ) : (
        <h2 id={id} className="sr-only">
          Why shop here
        </h2>
      )}
      {/* An odd last point takes the whole row on phones instead of sitting alone. */}
      <ul className={`grid grid-cols-2 gap-3 sm:gap-4 [&>li:last-child:nth-child(odd)]:col-span-2 lg:[&>li:last-child:nth-child(odd)]:col-span-1 ${cols}`}>
        {s.points.map((p, i) => {
          const Icon = TRUST_ICON[p.icon] ?? ShoppingBasket;
          return (
            <li key={i} className={`flex flex-col items-start gap-3 rounded-2xl bg-gradient-to-br p-4 ring-1 ring-line sm:flex-row sm:items-center sm:p-5 ${theme.banner}`}>
              <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ${theme.text} ${theme.ring}`}>
                <Icon aria-hidden className="size-5" />
              </span>
              <span className="min-w-0 break-words text-sm font-semibold text-ink sm:text-base">{p.text}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Native <details>: opens on tap without JavaScript, and every answer is in the HTML for search engines. */
export function FaqBlock({ section: s, theme, id }: { section: FaqPageSection; theme: FoodTheme; id: string }) {
  return (
    <>
      <SectionHeading id={id} title={s.title?.trim() || "Questions"} subtitle={s.subtitle?.trim() || undefined} />
      <div className="divide-y divide-line overflow-hidden rounded-2xl bg-white ring-1 ring-line">
        {s.items.map((q, i) => (
          <details key={i} className="group" open={i === 0}>
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-semibold text-ink transition hover:bg-surface sm:px-5 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 break-words">{q.question}</span>
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-full bg-white ring-1 transition group-open:rotate-180 ${theme.text} ${theme.ring}`}>
                <ChevronDown aria-hidden className="size-4" />
              </span>
            </summary>
            <RichText text={q.answer} className="px-4 pb-4 text-sm leading-relaxed text-muted sm:px-5 sm:text-base" />
          </details>
        ))}
      </div>
    </>
  );
}
