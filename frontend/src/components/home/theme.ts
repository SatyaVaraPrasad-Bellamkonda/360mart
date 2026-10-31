import type { FoodTheme } from "@/lib/catalog/food-theme";

// The home page's colours: the 360mart gold and the warm cream band of the
// original home hero (category pages use their own page colour instead).
export const HOME_THEME: FoodTheme = {
  text: "text-brand-deep",
  soft: "bg-brand-soft",
  ring: "ring-brand/30",
  solid: "bg-brand-deep",
  banner: "from-[#fdf1dc] via-[#fdf8f0] to-white",
  shadow: "shadow-amber-900/10",
  placeholder: "bg-gradient-to-br from-amber-100 to-yellow-50",
  chipOn: "bg-brand-deep border-brand-deep",
};
