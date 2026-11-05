import { HeroVisual } from "@/components/HeroVisual";
import { PageHero } from "@/components/category-page/PageHero";
import { HOME_DEFAULTS, type HomeHeroView } from "@/lib/home-page/types";
import { HOME_THEME } from "./theme";

// The home page hero from the design: words, a button, and the animated cart
// (with the admin's floating labels) or an uploaded photo. A full-width band.
// Shared by the shop and the designer's live preview.
export function HomeHero({ hero }: { hero: HomeHeroView }) {
  // Banner off: the page starts with its sections. The headline stays as the
  // page's one H1 for Google and screen readers, but isn't shown.
  if (!hero.enabled) return <h1 className="sr-only">{hero.headline}</h1>;
  const cart = hero.visual === "CART_ANIMATION";
  // The cart is drawn art, not a backdrop: "Full picture" falls back to picture right.
  const layout = cart && hero.layout === "IMAGE_BACKGROUND" ? "IMAGE_RIGHT" : hero.layout;
  const alt = hero.imageAlt || HOME_DEFAULTS.imageAlt;
  // Compact: a small cart on bigger screens and none on phones, where it would push the page down.
  const compact = hero.size === "COMPACT";
  // A full photo sits in the page column as a rounded card (lined up with the
  // sections below); the other layouts keep their soft full-width band.
  const photoCard = layout === "IMAGE_BACKGROUND";
  const view = (
    <PageHero
      band={!photoCard}
      theme={HOME_THEME}
      stats={[]}
      hero={{
        headline: hero.headline,
        accentLine: hero.accentLine,
        intro: hero.intro,
        imageUrl: cart ? null : hero.imageUrl,
        mobileImageUrl: cart ? null : hero.mobileImageUrl,
        imageAlt: alt,
        badge: hero.badge,
        trustPoints: [],
      }}
      display={{ enabled: hero.enabled, layout, size: hero.size, showBadge: hero.showBadge, showTrustPoints: false, showStats: false, animation: hero.animation }}
      button={hero.buttonLabel && hero.buttonLink ? { label: hero.buttonLabel, href: hero.buttonLink } : null}
      art={
        cart ? (
          compact ? (
            <div className="hidden md:block">
              <HeroVisual labels={hero.floatingLabels} alt={alt} compact />
            </div>
          ) : (
            <HeroVisual labels={hero.floatingLabels} alt={alt} />
          )
        ) : undefined
      }
    />
  );
  return photoCard ? <div className="mx-auto max-w-6xl px-4 pt-4 sm:pt-6">{view}</div> : view;
}
