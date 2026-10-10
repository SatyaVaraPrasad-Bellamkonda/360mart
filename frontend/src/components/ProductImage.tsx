import { ImageOff } from "lucide-react";
import Image from "next/image";

type Props = {
  name: string;
  image: string | null;
  sizes: string; // how wide the image shows at each screen size, so Next.js serves the right file
  className?: string; // size/shape of the frame, e.g. "aspect-square rounded-2xl"
  preload?: boolean; // true for the main image above the fold
  zoomOnHover?: boolean; // zooms when a parent with the `group` class is hovered
};

// Product photo in a fixed frame. Falls back to a neutral placeholder when
// a product has no photo yet.
export function ProductImage({ name, image, sizes, className = "", preload, zoomOnHover = true }: Props) {
  if (!image) {
    return (
      <div className={`flex items-center justify-center bg-surface text-muted ${className}`}>
        <ImageOff aria-hidden className="size-8" />
        <span className="sr-only">{name}</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-surface ${className}`}>
      <Image
        src={image}
        alt={name}
        fill
        sizes={sizes}
        preload={preload}
        className={`object-cover ${zoomOnHover ? "transition duration-500 ease-out group-hover:scale-105" : ""}`}
      />
    </div>
  );
}
