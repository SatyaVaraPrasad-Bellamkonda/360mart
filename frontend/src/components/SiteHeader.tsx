import { Suspense } from "react";
import { AccountLink, AccountLinkFallback } from "./auth/AccountLink";
import { DesktopCategoryNav, DesktopCategoryNavFallback, PhoneCategoryStrip, PhoneCategoryStripFallback } from "./HeaderCategories";
import { Logo } from "./Logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav aria-label="Categories" className="ml-auto hidden md:block">
          <Suspense fallback={<DesktopCategoryNavFallback />}>
            <DesktopCategoryNav />
          </Suspense>
        </nav>
        <Suspense fallback={<AccountLinkFallback />}>
          <AccountLink />
        </Suspense>
      </div>

      {/* Phones: the menu above is hidden, so show categories as a swipeable row */}
      <nav aria-label="Categories" className="border-t border-line md:hidden">
        <Suspense fallback={<PhoneCategoryStripFallback />}>
          <PhoneCategoryStrip />
        </Suspense>
      </nav>
    </header>
  );
}
