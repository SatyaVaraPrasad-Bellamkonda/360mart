import { Suspense } from "react";
import { AccountLink, AccountLinkFallback } from "./auth/AccountLink";
import { CartLink, CartLinkFallback } from "./cart/CartLink";
import { DesktopCategoryNav, DesktopCategoryNavFallback, PhoneCategoryStrip, PhoneCategoryStripFallback } from "./HeaderCategories";
import { Logo } from "./Logo";
import { NotificationBell } from "./notifications/NotificationBell";
import { SearchLauncher } from "./search/SearchLauncher";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4">
        <Logo />
        <nav aria-label="Categories" className="ml-auto hidden md:block">
          <Suspense fallback={<DesktopCategoryNavFallback />}>
            <DesktopCategoryNav />
          </Suspense>
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <SearchLauncher />
          {/* Reads the URL (usePathname), so it needs its own boundary; nothing shows until the user is known anyway. */}
          <Suspense fallback={null}>
            <NotificationBell />
          </Suspense>
          <Suspense fallback={<CartLinkFallback />}>
            <CartLink />
          </Suspense>
          <Suspense fallback={<AccountLinkFallback />}>
            <AccountLink />
          </Suspense>
        </div>
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
