"use client";

import { useState } from "react";
import type { HeroContent } from "./PageHero";

// The hero photo, marked data-ready once it has loaded, so an entrance effect
// (fade, slow zoom) plays on the photo itself instead of before it arrives.
// A photo that loaded before this code ran is caught by the ref.
export function HeroPicture({ hero, className }: { hero: HeroContent; className: string }) {
  const [ready, setReady] = useState(false);
  return (
    <picture>
      {hero.mobileImageUrl && <source media="(max-width: 767px)" srcSet={hero.mobileImageUrl} />}
      {/* A plain <img>: uploaded pictures are already resized by the backend, and <picture> picks the phone version. */}
      <img
        ref={(img) => {
          if (img?.complete && img.naturalWidth > 0) setReady(true);
        }}
        onLoad={() => setReady(true)}
        data-ready={ready ? "" : undefined}
        src={hero.imageUrl ?? hero.mobileImageUrl ?? undefined}
        alt={hero.imageAlt}
        fetchPriority="high"
        decoding="async"
        className={`absolute inset-0 size-full object-cover ${className}`}
      />
    </picture>
  );
}
