export const SITE = {
  name: "360mart",
  domain: "360mart.in",
  url: "https://360mart.in",
  title: "360mart – Fruits, Meat, Groceries & Fashion from Local Stores",
  description:
    "Shop fresh fruits, meat and fish, groceries and fashion from trusted neighbourhood stores on 360mart.in. Local sellers, fair prices and quick delivery to your doorstep.",
  locale: "en_IN",
} as const;

// The site logo shown in the header and footer. To change it, replace the
// file in /public (keep the name), or point `src` at a new file and set
// width/height to its pixel size (only the ratio matters).
export const LOGO = {
  src: "/logo.png",
  width: 806,
  height: 200,
  alt: "360mart.in",
} as const;
