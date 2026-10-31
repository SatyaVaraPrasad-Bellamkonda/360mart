import Image from "next/image";
import Link from "next/link";
import { LOGO } from "@/lib/site";

export function Logo() {
  return (
    // min-w-0 + h-auto: on a crowded phone header the logo shrinks in proportion instead of being squashed.
    <Link href="/" aria-label="360mart home" className="inline-block min-w-0 shrink">
      <Image src={LOGO.src} alt={LOGO.alt} width={LOGO.width} height={LOGO.height} preload className="h-auto max-h-12 w-auto max-w-full" />
    </Link>
  );
}
