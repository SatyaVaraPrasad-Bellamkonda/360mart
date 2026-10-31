import { HeroVisual } from "@/components/HeroVisual";
import { PageHero } from "@/components/category-page/PageHero";
import { HOME_DEFAULTS, type HomeHeroView } from "@/lib/home-page/types";
import { HOME_THEME } from "./theme";

// The home page hero from the design: words, a button, and the animated cart
// (with the admin's floating labels) or an uploaded photo. A full-width band.
// Shared by the shop and the designer's live preview.
export function HomeHero({ hero }: { hero: HomeHeroView }) {
  const cart = hero.visual === "CART_ANIMATION";
  // The cart is drawn art, not a backdrop: "Full picture" falls back to picture right.
  const layout = cart && hero.layout === "IMAGE_BACKGROUND" ? "IMAGE_RIGHT" : hero.layout;
  const alt = hero.imageAlt || HOME_DEFAULTS.imageAlt;
  return (
    <PageHero
      band
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
      art={cart ? <HeroVisual labels={hero.floatingLabels} alt={alt} /> : undefined}
    />
  );
}
