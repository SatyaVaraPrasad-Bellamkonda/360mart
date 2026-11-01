// The admin's product sheet: every product and size of the chosen categories
// in one Excel file (tabs "Products" and "Sizes"), edited and uploaded back,
// all or nothing on the backend. Here: the limits, the file check, the ids the
// download route accepts and turning the backend's cell errors
// ("products[12].name") into Tab / Row / Column / Problem rows.
// Safe for client and server code.

export const PRODUCT_SHEET_API = "/admin/products/sheet";
export const PRODUCT_SHEET_DOWNLOAD = "/admin/products/sheet/download";
export const MAX_SHEET_CATEGORIES = 50;
export const MAX_PRODUCT_SHEET_BYTES = 5 * 1024 * 1024;
export const PRODUCT_SHEET_ACCEPT = ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** A problem with the chosen file, or undefined when it can be sent. */
export function productSheetFileError(file: { name: string; size: number }): string | undefined {
  if (!/\.xlsx$/i.test(file.name)) return "Choose the .xlsx sheet you downloaded here.";
  if (file.size === 0) return "This file is empty. Choose the sheet you edited.";
  if (file.size > MAX_PRODUCT_SHEET_BYTES) return "The file is too big: at most 5 MB.";
  return undefined;
}

/** The ids as the download route wants them (0–50; none = whole catalog); null when the list isn't usable. */
export function readCategoryIds(values: string[]): number[] | null {
  const ids = [...new Set(values.flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean))];
  if (ids.length > MAX_SHEET_CATEGORIES || ids.some((v) => !/^[1-9]\d{0,14}$/.test(v))) return null;
  return ids.map(Number);
}

// Error path name → the column heading the admin sees in Excel.
const PRODUCT_COLUMNS: Record<string, string> = {
  productId: "Product ID",
  category: "Category",
  name: "Name",
  slug: "Slug",
  brand: "Brand",
  foodType: "Food type",
  shortDescription: "Short description",
  description: "Description",
  origin: "Origin",
  seasonStart: "Season start",
  seasonEnd: "Season end",
  alwaysInSeason: "Always in season",
  storageTip: "Storage tip",
  shelfLife: "Shelf life",
  badgeLabel: "Badge label",
  hsnCode: "HSN code",
  gstRate: "GST %",
  seoTitle: "SEO title",
  seoDescription: "SEO description",
  displayOrder: "Display order",
  featured: "Featured",
  active: "Active",
  sizes: "Sizes",
  version: "Version",
};

const SIZE_COLUMNS: Record<string, string> = {
  variantId: "Variant ID",
  product: "Product ID",
  productName: "Product",
  label: "Label",
  quantity: "Quantity",
  unit: "Unit",
  sku: "SKU",
  displayOrder: "Display order",
  active: "Active",
  version: "Version",
};

export type SheetIssue = { field: string; message: string };
export type SheetProblemRow = { key: string; tab: string; row: number | null; column: string; message: string };

/**
 * The backend's problems as table rows: whole-file ones ("header") first, then
 * the Products tab, then Sizes, each by row; "…and N more" ("rows") last.
 */
export function productSheetProblems(issues: SheetIssue[]): SheetProblemRow[] {
  return issues
    .map((issue, i) => {
      const m = /^(products|sizes)\[(\d+)\]\.(\w+)$/.exec(issue.field);
      const key = `${issue.field}#${i}`;
      if (m) {
        const columns = m[1] === "products" ? PRODUCT_COLUMNS : SIZE_COLUMNS;
        return { key, tab: m[1] === "products" ? "Products" : "Sizes", row: Number(m[2]), column: columns[m[3]] ?? humanize(m[3]), message: issue.message, rank: m[1] === "products" ? 1 : 2 };
      }
      if (issue.field === "rows") return { key, tab: "", row: null, column: "", message: issue.message, rank: 3 };
      return { key, tab: "Whole file", row: null, column: "", message: issue.message, rank: 0 };
    })
    .sort((a, b) => a.rank - b.rank || (a.row ?? 0) - (b.row ?? 0))
    .map((r): SheetProblemRow => ({ key: r.key, tab: r.tab, row: r.row, column: r.column, message: r.message }));
}

/** "boughtCategoryIds" → "Bought category ids": an unexpected field still reads as words. */
function humanize(field: string): string {
  const words = field.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The backend's "nothing to do" answers: a 200, but nothing changed. */
export const nothingChanged = (message: string) => /^No changes found|^The sheet has no products or sizes/i.test(message);
