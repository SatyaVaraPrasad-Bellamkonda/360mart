// The store owner's spreadsheets: the price sheet (prices, new sizes) and the
// batch sheet (deliveries of items with expiry batches). Both work the same
// way: choose subcategories → download → fill in → upload, all or nothing on
// the backend. Here: what differs per sheet, the limits, the file check and
// turning the backend's cell errors ("rows[7].expiresOn") into a table.
// Safe for client and server code.

export const MAX_SUBCATEGORIES = 30;
export const MAX_SHEET_BYTES = 2 * 1024 * 1024;
export const SHEET_ACCEPT = ".xlsx,.csv";
export type SheetFormat = "XLSX" | "CSV";
export type SheetKind = "price" | "batch";

type SheetConfig = {
  /** Backend path (GET = download, POST = upload). */
  api: string;
  /** Our route handler that streams the download. */
  download: string;
  /** "price sheet" / "batch sheet", for messages. */
  name: string;
  fileStem: string;
  /** Cell error suffix → the column name the owner sees in Excel. */
  columns: Record<string, string>;
};

export const SHEETS: Record<SheetKind, SheetConfig> = {
  price: {
    api: "/seller/store/price-sheet",
    download: "/seller/products/price-sheet/download",
    name: "price sheet",
    fileStem: "price-sheet",
    columns: {
      variantId: "Variant ID",
      currentMrp: "Current MRP",
      newMrp: "New MRP",
      currentPrice: "Current price",
      newPrice: "New price",
      currentStock: "Current stock",
      newStock: "New stock",
      currentLowStockAlert: "Current low-stock alert",
      newLowStockAlert: "New low-stock alert",
      currentMaxPerOrder: "Current max per order",
      newMaxPerOrder: "New max per order",
      currentAvailable: "Current available",
      newAvailable: "New available",
      currentSku: "Current SKU",
      newSku: "New SKU",
    },
  },
  batch: {
    api: "/seller/store/batch-sheet",
    download: "/seller/products/batch-sheet/download",
    name: "batch sheet",
    fileStem: "batch-sheet",
    columns: { variantId: "Variant ID", batchNo: "Batch no", quantity: "Quantity", costPrice: "Cost price", manufacturedOn: "Manufactured on", expiresOn: "Expires on" },
  },
};

export const isSheetKind = (v: unknown): v is SheetKind => v === "price" || v === "batch";

/**
 * The backend's sheet error codes. The price sheet first answered PRICE_SHEET_*;
 * both sheets now share SHEET_*. Reading either keeps the screens working on
 * old and new backends.
 */
export const sheetCode = (code: string) => (code.startsWith("PRICE_SHEET_") ? code.slice("PRICE_".length) : code);

/** A problem with the chosen file, or undefined when it can be sent. */
export function sheetFileError(file: { name: string; size: number }, kind: SheetKind): string | undefined {
  const name = SHEETS[kind].name;
  if (!/\.(xlsx|csv)$/i.test(file.name)) return `Choose the .xlsx or .csv ${name} you downloaded.`;
  if (file.size === 0) return `This file is empty. Choose the ${name} you filled in.`;
  if (file.size > MAX_SHEET_BYTES) return "The file must be at most 2 MB";
  return undefined;
}

/** The ids as the download route wants them; null when the list isn't usable. */
export function readSubcategoryIds(values: string[]): number[] | null {
  const ids = [...new Set(values.flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean))];
  if (ids.length === 0 || ids.length > MAX_SUBCATEGORIES || ids.some((v) => !/^\d{1,15}$/.test(v))) return null;
  return ids.map(Number);
}

export type SheetProblem = { row: number | null; column: string; message: string; key: string };

/** The backend's cell errors as table rows, by row number ("header" first, "…and N more" last). */
export function sheetProblems(fieldErrors: Record<string, string>, kind: SheetKind): SheetProblem[] {
  const columns = SHEETS[kind].columns;
  return Object.entries(fieldErrors)
    .map(([field, message]) => {
      const m = /^rows\[(\d+)\]\.(\w+)$/.exec(field);
      if (m) return { row: Number(m[1]), column: columns[m[2]] ?? m[2], message, key: field };
      return { row: null, column: field === "header" ? "Whole sheet" : "", message, key: field };
    })
    .sort((a, b) => order(a) - order(b));
}

function order(p: SheetProblem): number {
  if (p.key === "header") return -1;
  if (p.key === "rows") return Number.MAX_SAFE_INTEGER;
  return p.row ?? Number.MAX_SAFE_INTEGER - 1;
}

/**
 * A new sheet is needed: something changed in the app after the download (the
 * price sheet reports it on a "Current …" column), or the columns / Sheet ID
 * are broken or mixed from two downloads ("header").
 */
export const needsFreshSheet = (fieldErrors: Record<string, string>) => Object.keys(fieldErrors).some((f) => /\.current[A-Z]/.test(f) || f === "header");

/** The batch sheet's "nothing filled in" reply: a 200, but nothing changed and the sheet isn't used up. */
export const nothingReceived = (message: string) => /^No deliveries were found/i.test(message);
