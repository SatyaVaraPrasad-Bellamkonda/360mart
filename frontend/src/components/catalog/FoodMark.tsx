import type { FoodType } from "@/lib/catalog/types";
import { foodTypeLabel } from "@/lib/catalog/product-validation";

// The veg / non-veg symbol Indian shoppers look for on food (FSSAI style):
// a green square with a dot = veg, a brown square with a triangle = non-veg.
// FSSAI counts egg as non-veg, so egg uses the same symbol with its own label.
export function FoodMark({ type, className = "", decorative }: { type: FoodType | null; className?: string; decorative?: boolean }) {
  if (!type) return null;
  const veg = type === "VEG";
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : (foodTypeLabel(type) ?? undefined)}
      title={foodTypeLabel(type) ?? undefined}
      className={`inline-flex size-4 shrink-0 items-center justify-center rounded-[3px] border-[1.5px] bg-white ${veg ? "border-green-700" : "border-amber-900"} ${className}`}
    >
      {veg ? (
        <span className="size-2 rounded-full bg-green-700" />
      ) : (
        <span className="size-0 border-x-[4px] border-b-[7px] border-x-transparent border-b-amber-900" />
      )}
    </span>
  );
}
