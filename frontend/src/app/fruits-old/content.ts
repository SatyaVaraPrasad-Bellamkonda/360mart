import type { Faq } from "@/lib/types";

// Written content for the /fruits page. Unique, helpful text is what lets
// this page rank, so expand it over time (seasonal guides, recipes, tips).

export const FRUITS_SEO = {
  title: "Buy Fresh Fruits Online – Seasonal & Exotic Fruits",
  description:
    "Order fresh fruits online from trusted local stores. Mangoes, apples, bananas, oranges, grapes and exotic fruits, with prices from sellers near you.",
};

export const FRUITS_BANNER = {
  image: "/images/fruits/banners/fruits-hero.jpg",
  alt: "Colourful fresh fruits stacked at a local fruit stall",
};

export const FRUITS_INTRO =
  "Fresh, seasonal fruits from fruit shops in your neighbourhood. Compare prices from nearby stores and pick what's best today.";

export const FRUITS_GUIDE: { icon: "season" | "check" | "store"; heading: string; text: string }[] = [
  {
    icon: "season",
    heading: "Buy what's in season",
    text: "Seasonal fruits are fresher, tastier and better value. In India, winter brings oranges, apples and grapes, while summer is all about mangoes, watermelons and litchis.",
  },
  {
    icon: "check",
    heading: "Check before you buy",
    text: "Good fruit feels heavy for its size, has firm skin without bruises and smells fresh. Avoid fruit with soft spots, wrinkles or a sour smell.",
  },
  {
    icon: "store",
    heading: "Store fruit the right way",
    text: "Bananas, mangoes and avocados ripen best at room temperature. Apples, grapes and berries last longer in the fridge. Keep bananas away from other fruit, as they make it ripen faster.",
  },
];

export const FRUITS_FAQS: Faq[] = [
  {
    question: "Where do the fruits on 360mart come from?",
    answer:
      "Every fruit on 360mart is sold by a local store near you. Each product page shows which stores have it and what each one charges.",
  },
  {
    question: "Why do prices differ between stores?",
    answer:
      "Each store sets its own price based on its stock and quality. 360mart shows them side by side so you can choose.",
  },
  {
    question: "Can I buy fruits by weight or by count?",
    answer:
      "Both. Most fruits are sold by weight (500 g or 1 kg), while some, like bananas, kiwis and dragon fruit, are sold by the piece or dozen.",
  },
  {
    question: "Which fruits are in season right now?",
    answer: "Look for the “In season” label, or check the In season now section on this page.",
  },
];
