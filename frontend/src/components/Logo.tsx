import Image from "next/image";
import Link from "next/link";
import { LOGO } from "@/lib/site";

export function Logo() {
  return (
    <Link href="/" aria-label="360mart home" className="inline-block">
      <Image src={LOGO.src} alt={LOGO.alt} width={LOGO.width} height={LOGO.height} preload className="h-12 w-auto" />
    </Link>
  );
}
