"use client";

import { ShoppingBasket } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  src: string | null;
  alt: string;
  /** Size and shape of the box, e.g. "size-14 rounded-xl" or "absolute inset-0". */
  className?: string;
  iconClassName?: string;
  /** Eager for the main picture at the top of a page. */
  priority?: boolean;
};

// A category picture from the backend's storage. A plain <img>, not next/image:
// the links are signed and expire after about an hour, so they mustn't be cached
// by the image optimiser. No picture, or a link that no longer works → a placeholder.
export function CategoryImage({ src, alt, className = "", iconClassName = "size-1/3", priority }: Props) {
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState<string | null>(null);

  // A link that failed before React was ready never fires onError: check once.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0 && src) setFailed(src);
  }, [src]);

  if (!src || failed === src) {
    return (
      <span
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={`flex items-center justify-center bg-gradient-to-br from-brand-soft via-amber-50 to-green-50 text-brand-deep/60 ${className}`}
      >
        <ShoppingBasket aria-hidden className={iconClassName} strokeWidth={1.5} />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- signed, expiring links (see above)
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(src)}
      className={`object-cover ${className}`}
    />
  );
}
