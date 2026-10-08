import Image from "next/image";

type Props = {
  name: string;
  emoji: string;
  image: string | null;
  tint: string;
  size?: "card" | "large";
  preload?: boolean;
};

// Shows the product photo when one exists, otherwise an emoji placeholder.
export function ProductImage({ name, emoji, image, tint, size = "card", preload }: Props) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-xl ${tint} ${size === "large" ? "aspect-[4/3] md:aspect-square" : "aspect-square"}`}
    >
      {image ? (
        <Image
          src={image}
          alt={name}
          fill
          preload={preload}
          sizes={size === "large" ? "(min-width: 768px) 480px, 100vw" : "(min-width: 1024px) 240px, 50vw"}
          className="object-cover"
        />
      ) : (
        <span role="img" aria-label={name} className={size === "large" ? "text-[9rem]" : "text-6xl"}>
          {emoji}
        </span>
      )}
    </div>
  );
}
