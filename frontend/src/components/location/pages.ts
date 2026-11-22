// Pages where shopping happens. Account, store, admin, sign-in, checkout (it has
// its own address step) and policy pages never get the first-visit sheet or the
// "not here yet" strip.
const QUIET = ["/admin", "/seller", "/account", "/login", "/signup", "/forgot-password", "/checkout", "/goodbye", "/terms", "/privacy", "/refund-policy", "/seller-agreement", "/contact", "/legal"];

export const isShoppingPage = (path: string) => !QUIET.some((p) => path === p || path.startsWith(`${p}/`));
