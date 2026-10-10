// TEMPORARY sample data, used until the Spring Boot backend exists.
// Stores, prices and stock here are made up. Pages built from this data are
// marked noindex and show a preview banner (see USES_SAMPLE_DATA in lib/api.ts).

import type { Offer, Product, Store, Subcategory, Variant } from "../types";

export const SAMPLE_STORES: Store[] = [
  { slug: "green-basket", name: "Green Basket Fruits", area: "Madhapur", city: "Hyderabad" },
  { slug: "daily-fresh", name: "Daily Fresh Mart", area: "Kukatpally", city: "Hyderabad" },
  { slug: "farm-corner", name: "Farm Fresh Corner", area: "Ameerpet", city: "Hyderabad" },
];

// v("1 kg", 220, ["green-basket", 179], ["daily-fresh", 189, false])
// → a variant whose MRP is 220, sold by two stores (the second out of stock).
function v(label: string, mrp: number, ...offers: [store: string, price: number, inStock?: boolean][]): Variant {
  return {
    id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    label,
    offers: offers.map(([storeSlug, price, inStock = true]): Offer => ({ storeSlug, price, mrp, inStock })),
  };
}

export const FRUIT_SUBCATEGORIES: Subcategory[] = [
  {
    slug: "mangoes",
    category: "fruits",
    name: "Mangoes",
    image: "/images/fruits/subcategories/mangoes.jpg",
    shortDescription: "Alphonso, Banganapalli, Kesar and more",
    seoTitle: "Buy Fresh Mangoes Online – Alphonso, Banganapalli, Kesar",
    seoDescription:
      "Order fresh mangoes online from local fruit stores. Choose from Alphonso, Banganapalli, Kesar and Totapuri, compare prices and get them delivered.",
    intro: [
      "India grows more mangoes than any other country, and each region has its favourite. Alphonso from Ratnagiri is prized for its rich aroma, Banganapalli from Andhra Pradesh for its large, sweet, fibre-free flesh, and Kesar from Gujarat for its saffron colour.",
      "Peak mango season runs from April to July. Outside those months, availability depends on cold-stored stock at your local stores.",
    ],
    faqs: [
      {
        question: "How do I know if a mango is ripe?",
        answer:
          "A ripe mango gives slightly when pressed gently and smells sweet near the stem. Colour alone is not a reliable sign, as many varieties stay green when ripe.",
      },
      {
        question: "How should I ripen mangoes at home?",
        answer:
          "Keep unripe mangoes at room temperature, wrapped in newspaper or placed in a paper bag, for two to four days. Move them to the fridge once ripe.",
      },
      {
        question: "Which mango is best for juice and pickles?",
        answer: "Totapuri is a good choice for juice, pulp and pickles because of its tangy taste and firm flesh.",
      },
    ],
    sortOrder: 1,
  },
  {
    slug: "apples",
    category: "fruits",
    name: "Apples",
    image: "/images/fruits/subcategories/apples.jpg",
    shortDescription: "Shimla, Kashmiri and imported varieties",
    seoTitle: "Buy Fresh Apples Online – Shimla, Kashmiri & Imported",
    seoDescription:
      "Shop crisp, fresh apples from local stores. Shimla, Kashmiri, Washington and green apples with prices from nearby sellers.",
    intro: [
      "Indian apples from Himachal Pradesh and Kashmir arrive fresh between August and November, when they are at their crispest and best value. Imported varieties such as Washington and Granny Smith are available all year.",
      "Choose apples that feel firm and heavy for their size, with smooth skin and no soft spots.",
    ],
    faqs: [
      {
        question: "How long do apples stay fresh?",
        answer: "Apples stay crisp for three to four weeks in the fridge, and about a week at room temperature.",
      },
      {
        question: "What is the difference between Shimla and Kashmiri apples?",
        answer:
          "Shimla apples are usually bright red and slightly tart, while Kashmiri apples tend to be sweeter, juicier and deeper red with light streaks.",
      },
    ],
    sortOrder: 2,
  },
  {
    slug: "bananas",
    category: "fruits",
    name: "Bananas",
    image: "/images/fruits/subcategories/bananas.jpg",
    shortDescription: "Robusta, Yelakki and red bananas",
    seoTitle: "Buy Fresh Bananas Online – Robusta, Yelakki, Red Banana",
    seoDescription:
      "Order fresh bananas from local fruit sellers. Robusta, Yelakki and red bananas, sold by the dozen or by weight.",
    intro: [
      "Bananas are grown across India all year round, which keeps them fresh and affordable in every season. Robusta is the everyday favourite, Yelakki is small and extra sweet, and red bananas have a soft, berry-like flavour.",
    ],
    faqs: [
      {
        question: "How do I stop bananas ripening too fast?",
        answer:
          "Keep them away from other fruit, hang them if you can, and wrap the stems in cling film. Once ripe, they can go in the fridge; the skin darkens but the fruit stays good.",
      },
      {
        question: "Are Yelakki bananas sweeter than Robusta?",
        answer: "Yes. Yelakki bananas are smaller with thin skin and a noticeably sweeter, more fragrant taste.",
      },
    ],
    sortOrder: 3,
  },
  {
    slug: "citrus",
    category: "fruits",
    name: "Citrus Fruits",
    image: "/images/fruits/subcategories/citrus.jpg",
    shortDescription: "Oranges, mosambi and kinnow",
    seoTitle: "Buy Oranges & Mosambi Online – Fresh Citrus Fruits",
    seoDescription:
      "Fresh Nagpur oranges, mosambi (sweet lime) and kinnow from local stores. Great for juice and rich in vitamin C.",
    intro: [
      "Citrus fruits are a winter favourite in India. Nagpur oranges come into season from October, mosambi (sweet lime) is a juice-stall classic, and kinnow from Punjab arrives between December and March.",
    ],
    faqs: [
      {
        question: "Which citrus fruit is best for juice?",
        answer: "Mosambi gives a mild, sweet juice, while Nagpur oranges and kinnow give a tangier, more flavourful one.",
      },
      {
        question: "How do I pick juicy oranges?",
        answer: "Pick oranges that feel heavy for their size with thin, smooth skin. Heavier fruit usually holds more juice.",
      },
    ],
    sortOrder: 4,
  },
  {
    slug: "grapes",
    category: "fruits",
    name: "Grapes",
    image: "/images/fruits/subcategories/grapes.jpg",
    shortDescription: "Green seedless, black and red globe",
    seoTitle: "Buy Fresh Grapes Online – Green, Black & Red Globe",
    seoDescription:
      "Order fresh seedless green grapes, black grapes and red globe grapes from local fruit stores near you.",
    intro: [
      "Most Indian grapes come from Nashik and the surrounding regions of Maharashtra, with the main harvest between January and April. Red globe grapes are mostly imported and available for longer.",
    ],
    faqs: [
      {
        question: "How should I wash grapes?",
        answer:
          "Soak them for a few minutes in water with a pinch of salt or baking soda, then rinse well under running water just before eating.",
      },
      {
        question: "How long do grapes last?",
        answer: "Unwashed grapes keep for about a week in the fridge in a ventilated bag.",
      },
    ],
    sortOrder: 5,
  },
  {
    slug: "exotic",
    category: "fruits",
    name: "Exotic Fruits",
    image: "/images/fruits/subcategories/exotic.jpg",
    shortDescription: "Kiwi, dragon fruit, avocado, berries",
    seoTitle: "Buy Exotic Fruits Online – Kiwi, Dragon Fruit, Avocado",
    seoDescription:
      "Shop exotic fruits like kiwi, dragon fruit, avocado and blueberries from local stores, with prices from nearby sellers.",
    intro: [
      "Exotic fruits are now easy to find in Indian cities. Many, like dragon fruit and kiwi, are also grown in India today, which makes them fresher and more affordable than before.",
    ],
    faqs: [
      {
        question: "How do I know when an avocado is ready to eat?",
        answer:
          "A ready avocado yields slightly to gentle pressure. Firm avocados ripen in two to four days at room temperature.",
      },
      {
        question: "How do I eat dragon fruit?",
        answer: "Cut it in half and scoop out the flesh with a spoon, or peel and slice it. The black seeds are edible.",
      },
    ],
    sortOrder: 6,
  },
];

export const FRUIT_PRODUCTS: Product[] = [
  // Mangoes
  {
    slug: "alphonso-mango",
    category: "fruits",
    subcategory: "mangoes",
    name: "Alphonso Mango",
    image: "/images/fruits/products/alphonso-mango.jpg",
    shortDescription: "The king of mangoes, from Ratnagiri",
    description:
      "Alphonso (Hapus) mangoes are known for their rich aroma, saffron-coloured flesh and smooth, fibre-free texture. Ideal for eating fresh, milkshakes and aamras.",
    origin: "Ratnagiri and Devgad, Maharashtra",
    bestSeason: "April to June",
    storageTip: "Ripen at room temperature, then refrigerate and eat within 3–4 days.",
    inSeason: false,
    variants: [v("1 kg", 799, ["green-basket", 699, false], ["farm-corner", 729, false])],
  },
  {
    slug: "banganapalli-mango",
    category: "fruits",
    subcategory: "mangoes",
    name: "Banganapalli Mango",
    image: "/images/fruits/products/banganapalli-mango.jpg",
    shortDescription: "Large, sweet and fibre-free",
    description:
      "Banganapalli mangoes from Andhra Pradesh are large with thin golden skin and sweet, firm flesh. A favourite for eating sliced.",
    origin: "Kurnool, Andhra Pradesh",
    bestSeason: "April to July",
    storageTip: "Keep at room temperature until ripe, then refrigerate.",
    inSeason: false,
    variants: [v("1 kg", 180, ["daily-fresh", 149], ["green-basket", 159])],
  },
  {
    slug: "kesar-mango",
    category: "fruits",
    subcategory: "mangoes",
    name: "Kesar Mango",
    image: "/images/fruits/products/kesar-mango.jpg",
    shortDescription: "Saffron-coloured and fragrant",
    description: "Kesar mangoes from Gujarat have bright saffron flesh and a sweet, fragrant taste. Excellent for desserts and pulp.",
    origin: "Junagadh, Gujarat",
    bestSeason: "May to July",
    storageTip: "Ripen at room temperature, then refrigerate.",
    inSeason: false,
    variants: [v("1 kg", 299, ["farm-corner", 249])],
  },
  {
    slug: "totapuri-mango",
    category: "fruits",
    subcategory: "mangoes",
    name: "Totapuri Mango",
    image: "/images/fruits/products/totapuri-mango.jpg",
    shortDescription: "Tangy, ideal for juice and pickles",
    description:
      "Totapuri mangoes have a distinctive parrot-beak shape and a tangy-sweet taste. Perfect for juice, pulp, chutney and pickles.",
    origin: "Andhra Pradesh and Karnataka",
    bestSeason: "May to July",
    storageTip: "Store in a cool place; refrigerate once ripe.",
    inSeason: false,
    variants: [v("1 kg", 110, ["daily-fresh", 89], ["green-basket", 95])],
  },

  // Apples
  {
    slug: "shimla-apple",
    category: "fruits",
    subcategory: "apples",
    name: "Shimla Apple",
    image: "/images/fruits/products/shimla-apple.jpg",
    shortDescription: "Crisp red apples from Himachal",
    description: "Fresh-season apples from the orchards of Himachal Pradesh. Crisp, juicy and slightly tart.",
    origin: "Shimla, Himachal Pradesh",
    bestSeason: "August to November",
    storageTip: "Refrigerate in the crisper drawer; stays fresh for 3–4 weeks.",
    inSeason: true,
    variants: [
      v("1 kg", 220, ["green-basket", 179], ["daily-fresh", 185], ["farm-corner", 189]),
      v("500 g", 115, ["green-basket", 95], ["daily-fresh", 99]),
    ],
  },
  {
    slug: "kashmiri-apple",
    category: "fruits",
    subcategory: "apples",
    name: "Kashmiri Apple",
    image: "/images/fruits/products/kashmiri-apple.jpg",
    shortDescription: "Sweet and juicy, from the valley",
    description: "Kashmiri apples are sweet, juicy and deep red with light streaks. A seasonal favourite from the Kashmir valley.",
    origin: "Kashmir",
    bestSeason: "September to November",
    storageTip: "Refrigerate; keep away from bananas to slow ripening.",
    inSeason: true,
    variants: [v("1 kg", 240, ["farm-corner", 199], ["green-basket", 209])],
  },
  {
    slug: "washington-apple",
    category: "fruits",
    subcategory: "apples",
    name: "Washington Apple",
    image: "/images/fruits/products/washington-apple.jpg",
    shortDescription: "Imported, deep red and sweet",
    description: "Imported Red Delicious apples from Washington, USA. Deep red, mildly sweet and available all year.",
    origin: "Washington, USA",
    bestSeason: "All year (imported)",
    storageTip: "Refrigerate; stays fresh for up to a month.",
    inSeason: true,
    variants: [v("4 pcs", 299, ["daily-fresh", 249], ["green-basket", 259])],
  },
  {
    slug: "green-apple",
    category: "fruits",
    subcategory: "apples",
    name: "Green Apple",
    image: "/images/fruits/products/green-apple.jpg",
    shortDescription: "Tart and crunchy Granny Smith",
    description: "Granny Smith green apples are tart, crunchy and great for salads, juices and baking.",
    origin: "Imported",
    bestSeason: "All year (imported)",
    storageTip: "Refrigerate in a ventilated bag.",
    inSeason: true,
    variants: [v("4 pcs", 279, ["green-basket", 229])],
  },

  // Bananas
  {
    slug: "robusta-banana",
    category: "fruits",
    subcategory: "bananas",
    name: "Robusta Banana",
    image: "/images/fruits/products/robusta-banana.jpg",
    shortDescription: "Everyday bananas, sold by the dozen",
    description: "Robusta bananas are the most common everyday banana in India: filling, mildly sweet and great value.",
    origin: "Andhra Pradesh and Tamil Nadu",
    bestSeason: "All year",
    storageTip: "Keep at room temperature, away from other fruit.",
    inSeason: true,
    variants: [
      v("12 pcs", 72, ["daily-fresh", 59], ["green-basket", 62], ["farm-corner", 65]),
      v("6 pcs", 38, ["daily-fresh", 32], ["green-basket", 34]),
    ],
  },
  {
    slug: "yelakki-banana",
    category: "fruits",
    subcategory: "bananas",
    name: "Yelakki Banana",
    image: "/images/fruits/products/yelakki-banana.jpg",
    shortDescription: "Small, thin-skinned and extra sweet",
    description: "Yelakki bananas are small, thin-skinned and fragrant, with a sweeter taste than regular bananas.",
    origin: "Karnataka",
    bestSeason: "All year",
    storageTip: "Keep at room temperature and eat within 3–4 days.",
    inSeason: true,
    variants: [v("1 kg", 115, ["farm-corner", 95], ["green-basket", 99]), v("500 g", 60, ["farm-corner", 49])],
  },
  {
    slug: "red-banana",
    category: "fruits",
    subcategory: "bananas",
    name: "Red Banana",
    image: "/images/fruits/products/red-banana.jpg",
    shortDescription: "Soft, creamy and berry-sweet",
    description: "Red bananas have reddish-purple skin and soft, creamy flesh with a hint of berry flavour.",
    origin: "Tamil Nadu and Kerala",
    bestSeason: "All year",
    storageTip: "Ripe when the skin darkens slightly; keep at room temperature.",
    inSeason: true,
    variants: [v("6 pcs", 110, ["green-basket", 89])],
  },

  // Citrus
  {
    slug: "nagpur-orange",
    category: "fruits",
    subcategory: "citrus",
    name: "Nagpur Orange",
    image: "/images/fruits/products/nagpur-orange.jpg",
    shortDescription: "Juicy, easy-peel oranges",
    description: "Nagpur oranges are juicy, easy to peel and tangy-sweet. Great for eating fresh and for juice.",
    origin: "Nagpur, Maharashtra",
    bestSeason: "October to February",
    storageTip: "Keep in a cool place for a week, or refrigerate for longer.",
    inSeason: true,
    variants: [v("1 kg", 160, ["daily-fresh", 129], ["farm-corner", 135], ["green-basket", 139])],
  },
  {
    slug: "mosambi",
    category: "fruits",
    subcategory: "citrus",
    name: "Mosambi (Sweet Lime)",
    image: "/images/fruits/products/mosambi.jpg",
    shortDescription: "Mild and sweet, perfect for juice",
    description: "Mosambi, or sweet lime, gives a mild, refreshing juice and is a popular choice for daily fresh juice.",
    origin: "Maharashtra and Andhra Pradesh",
    bestSeason: "October to March",
    storageTip: "Store at room temperature for a week or refrigerate.",
    inSeason: true,
    variants: [v("1 kg", 99, ["green-basket", 79], ["daily-fresh", 82])],
  },
  {
    slug: "kinnow",
    category: "fruits",
    subcategory: "citrus",
    name: "Kinnow",
    image: "/images/fruits/products/kinnow.jpg",
    shortDescription: "Tangy-sweet winter citrus from Punjab",
    description: "Kinnow is a juicy, tangy-sweet citrus fruit from Punjab, best known for its bright, refreshing juice.",
    origin: "Punjab",
    bestSeason: "December to March",
    storageTip: "Refrigerate for up to two weeks.",
    inSeason: false,
    variants: [v("1 kg", 130, ["farm-corner", 109, false])],
  },

  // Grapes
  {
    slug: "green-seedless-grapes",
    category: "fruits",
    subcategory: "grapes",
    name: "Green Seedless Grapes",
    image: "/images/fruits/products/green-seedless-grapes.jpg",
    shortDescription: "Sweet and crunchy Thompson grapes",
    description: "Thompson seedless green grapes from Nashik: sweet, crunchy and perfect for snacking.",
    origin: "Nashik, Maharashtra",
    bestSeason: "January to April",
    storageTip: "Refrigerate unwashed in a ventilated bag; wash just before eating.",
    inSeason: false,
    variants: [v("500 g", 110, ["green-basket", 89], ["daily-fresh", 92])],
  },
  {
    slug: "black-grapes",
    category: "fruits",
    subcategory: "grapes",
    name: "Black Grapes",
    image: "/images/fruits/products/black-grapes.jpg",
    shortDescription: "Rich, sweet seedless black grapes",
    description: "Seedless black grapes with a rich, sweet flavour and deep colour. Great on their own or in fruit salads.",
    origin: "Nashik, Maharashtra",
    bestSeason: "January to April",
    storageTip: "Refrigerate unwashed; eat within a week.",
    inSeason: false,
    variants: [v("500 g", 120, ["daily-fresh", 99])],
  },
  {
    slug: "red-globe-grapes",
    category: "fruits",
    subcategory: "grapes",
    name: "Red Globe Grapes",
    image: "/images/fruits/products/red-globe-grapes.jpg",
    shortDescription: "Large, juicy imported grapes",
    description: "Red globe grapes are large, firm and juicy with a mild sweetness. They contain seeds.",
    origin: "Imported",
    bestSeason: "All year (imported)",
    storageTip: "Refrigerate in a ventilated bag.",
    inSeason: true,
    variants: [v("500 g", 230, ["farm-corner", 189])],
  },

  // Exotic
  {
    slug: "kiwi",
    category: "fruits",
    subcategory: "exotic",
    name: "Kiwi",
    image: "/images/fruits/products/kiwi.jpg",
    shortDescription: "Tangy green fruit rich in vitamin C",
    description: "Kiwis have bright green flesh with a tangy-sweet taste. Eat them scooped out with a spoon or sliced.",
    origin: "Arunachal Pradesh and imported",
    bestSeason: "All year",
    storageTip: "Ripen at room temperature, then refrigerate.",
    inSeason: true,
    variants: [v("3 pcs", 150, ["green-basket", 119], ["farm-corner", 125])],
  },
  {
    slug: "dragon-fruit",
    category: "fruits",
    subcategory: "exotic",
    name: "Dragon Fruit",
    image: "/images/fruits/products/dragon-fruit.jpg",
    shortDescription: "Striking pink fruit with mild, sweet flesh",
    description: "Dragon fruit has bright pink skin and white flesh dotted with tiny black seeds. Mildly sweet and refreshing.",
    origin: "Gujarat and Maharashtra",
    bestSeason: "July to October",
    storageTip: "Refrigerate and eat within 5 days.",
    inSeason: true,
    variants: [v("1 pc", 130, ["farm-corner", 99], ["daily-fresh", 105])],
  },
  {
    slug: "avocado",
    category: "fruits",
    subcategory: "exotic",
    name: "Avocado",
    image: "/images/fruits/products/avocado.jpg",
    shortDescription: "Creamy, for toast, salads and guacamole",
    description: "Creamy avocados, ideal for toast, salads, smoothies and guacamole.",
    origin: "Imported and Karnataka",
    bestSeason: "All year",
    storageTip: "Ripen at room temperature; refrigerate once soft.",
    inSeason: true,
    variants: [v("1 pc", 199, ["green-basket", 149])],
  },
  {
    slug: "blueberries",
    category: "fruits",
    subcategory: "exotic",
    name: "Blueberries",
    image: "/images/fruits/products/blueberries.jpg",
    shortDescription: "Sweet, ready-to-eat berries",
    description: "Plump, sweet blueberries. Great with breakfast cereal, yoghurt or on their own.",
    origin: "Imported",
    bestSeason: "All year (imported)",
    storageTip: "Refrigerate and wash just before eating.",
    inSeason: true,
    variants: [v("125 g", 399, ["farm-corner", 349])],
  },
];
