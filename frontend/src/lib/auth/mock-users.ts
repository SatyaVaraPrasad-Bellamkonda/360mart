import "server-only";

// TEMPORARY test accounts for mock login (AUTH_MOCK=true, local only).
// The Spring Boot backend replaces all of this.

export const MOCK_OTP = "123456";

// Shopkeepers are matched by registered phone number.
export const MOCK_SELLERS: { phone: string; storeSlug: string; storeName: string }[] = [
  { phone: "9000000001", storeSlug: "green-basket", storeName: "Green Basket Fruits" },
  { phone: "9000000002", storeSlug: "daily-fresh", storeName: "Daily Fresh Mart" },
  { phone: "9000000003", storeSlug: "farm-corner", storeName: "Farm Fresh Corner" },
];
