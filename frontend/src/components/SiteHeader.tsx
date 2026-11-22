import { Suspense } from "react";
import { AccountLink, AccountLinkFallback } from "./auth/AccountLink";
import { CartLink, CartLinkFallback } from "./cart/CartLink";
import { DesktopCategoryLinks, DesktopCategoryLinksFallback, HeaderSearch, PhoneCategoryStrip, PhoneCategoryStripFallback } from "./HeaderCategories";
import { LocationChip } from "./location/LocationChip";
import { Logo } from "./Logo";
import { NotificationBell } from "./notifications/NotificationBell";
import { SearchLauncher } from "./search/SearchLauncher";

// The site header, in the page column (max-w-page). Tablets and up: logo |
// Deliver to | search (a wide box from 1024px) | bell, cart, account, and a
// second row of category links. Phones: logo | search, bell, cart, account,
// the delivery address on a full-width line under them, then the category strip.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-[#ece8e1] bg-white/[0.86] backdrop-blur-xl">
      <div className="mx-auto flex max-w-page items-center gap-2 px-4 pb-0.5 pt-2.5 sm:gap-3 sm:px-6 md:gap-4 md:py-3 lg:gap-5 lg:px-8">
        <Logo />
        <div className="hidden min-w-0 shrink-0 md:flex">
          <LocationChip variant="bar" />
        </div>
        <div className="ml-auto flex shrink-0 justify-end lg:ml-0 lg:min-w-0 lg:flex-1 lg:shrink">
          <Suspense fallback={<SearchLauncher />}>
            <HeaderSearch />
          </Suspense>
        </div>
        <nav aria-label="Your account" className="flex shrink-0 items-center gap-1.5">
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
        </nav>
      </div>

      {/* Phones: the delivery address on its own line under the logo (the whole width, so it isn't cut short) */}
      <div className="mx-auto max-w-page px-4 pb-1 sm:px-6 md:hidden">
        <LocationChip variant="line" />
      </div>

      {/* Tablets and up: every category as a text link */}
      <nav aria-label="Categories" className="mx-auto hidden max-w-page px-4 sm:px-6 md:block lg:px-8">
        <Suspense fallback={<DesktopCategoryLinksFallback />}>
          <DesktopCategoryLinks />
        </Suspense>
      </nav>

      {/* Phones: the categories as a swipeable row */}
      <nav aria-label="Categories" className="border-t border-[#ece8e1] md:hidden">
        <Suspense fallback={<PhoneCategoryStripFallback />}>
          <PhoneCategoryStrip />
        </Suspense>
      </nav>
    </header>
  );
}
