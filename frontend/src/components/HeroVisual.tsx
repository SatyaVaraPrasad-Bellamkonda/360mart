import Image from "next/image";

// Floating labels around the cart. Positions are % of the square visual.
const CHIPS = [
  { text: "Fresh & Fast", className: "left-[0%] top-[24%]", delay: "0s" },
  { text: "Everything you need", className: "right-[0%] top-[8%]", delay: "1.2s" },
  { text: "Quick delivery", className: "right-[-2%] top-[44%]", delay: "2.4s" },
  { text: "Your local favourites", className: "right-[2%] bottom-[18%]", delay: "0.6s" },
];

const SPARKLES = [
  "left-[18%] top-[12%] text-xl",
  "right-[22%] top-[2%] text-base",
  "left-[8%] bottom-[30%] text-sm",
  "right-[6%] top-[30%] text-lg",
  "left-[30%] bottom-[8%] text-sm",
  "right-[18%] bottom-[6%] text-base",
];

// Home page hero art: the 360mart cart inside a soft glow with orbit rings,
// sparkles and floating labels. Labels are decorative, so screen readers
// only get the image description.
export function HeroVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-xs sm:max-w-lg">
      <div aria-hidden className="absolute inset-[4%] rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(187,247,208,0.9),rgba(254,243,199,0.7)_45%,rgba(253,230,138,0.25)_62%,transparent_72%)] blur-md" />
      <div aria-hidden className="absolute inset-[6%] rounded-full border border-green-200/80" />
      <div aria-hidden className="absolute inset-[14%] rounded-full border-2 border-dashed border-amber-200 motion-safe:animate-[spin_60s_linear_infinite]" />
      <div aria-hidden className="absolute inset-x-[-2%] top-[38%] h-[34%] -rotate-12 rounded-[50%] border-[3px] border-brand/45 border-l-transparent" />

      <Image
        src="/hero-cart.png"
        alt="Shopping cart full of fruits, vegetables, groceries, fish and clothes from local stores"
        fill
        preload
        sizes="(min-width: 640px) 512px, 320px"
        className="object-contain p-[5%] drop-shadow-[0_20px_25px_rgba(180,83,9,0.18)]"
      />

      {SPARKLES.map((position) => (
        <span key={position} aria-hidden className={`absolute text-amber-300 ${position}`}>
          ✦
        </span>
      ))}

      {CHIPS.map((chip) => (
        <span
          key={chip.text}
          aria-hidden
          style={{ animationDelay: chip.delay }}
          className={`absolute whitespace-nowrap rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-ink shadow-md ring-1 ring-line backdrop-blur sm:text-xs motion-safe:animate-float ${chip.className}`}
        >
          {chip.text}
        </span>
      ))}
    </div>
  );
}
