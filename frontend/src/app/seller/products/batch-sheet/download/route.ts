import { downloadSheet } from "@/lib/inventory/sheet-download";

// GET /seller/products/batch-sheet/download?subcategoryIds=…&format=XLSX|CSV (see lib/inventory/sheet-download.ts).
export function GET(request: Request) {
  return downloadSheet(request, "batch");
}
