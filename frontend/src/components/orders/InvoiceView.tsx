import { day, money } from "@/lib/orders/format";
import type { Invoice } from "@/lib/orders/types";
import { PrintButton } from "./PrintButton";

// The GST invoice (or bill of supply) as a printable page, the same for the
// shopper, the store and the admin. "Download PDF" = the browser's print
// dialog (Save as PDF); the site header, footer and buttons are hidden in print
// (globals.css). Every number comes from the backend; nothing is recalculated.

export function InvoiceView({ invoice: inv, backHref, backLabel }: { invoice: Invoice; backHref: string; backLabel: string }) {
  const tax = inv.invoiceType === "TAX_INVOICE";
  const intra = inv.supplyType === "INTRA_STATE";
  const title = tax ? "Tax Invoice" : "Bill of Supply";
  const num = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10 print:max-w-none print:p-0">
      <div data-print-hide className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <a href={backHref} className="flex min-h-10 items-center rounded-full px-3 text-sm font-semibold text-ink ring-1 ring-line hover:bg-surface">
          ← {backLabel}
        </a>
        <PrintButton />
      </div>

      <article className="rounded-3xl bg-white p-5 ring-1 ring-line sm:p-8 print:rounded-none print:p-0 print:ring-0">
        <header className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted">{title}</p>
            <h1 className="mt-1 text-2xl font-extrabold text-ink">{inv.invoiceNumber}</h1>
            <p className="mt-1 text-sm text-muted">
              Order {inv.orderNumber} · {day(inv.issuedAt)} · FY {inv.financialYear}
            </p>
          </div>
          <div className="text-sm sm:text-right">
            <p className="font-bold text-ink">{inv.sellerName}</p>
            <p className="max-w-xs text-muted sm:ml-auto">{inv.sellerAddress}</p>
            {inv.sellerGstin && <p className="mt-1 text-muted">GSTIN: <span className="font-semibold text-ink">{inv.sellerGstin}</span></p>}
            {inv.sellerFssaiLicenseNo && <p className="text-muted">FSSAI: {inv.sellerFssaiLicenseNo}</p>}
          </div>
        </header>

        <div className="grid gap-4 border-b border-line py-5 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Billed to</p>
            <p className="mt-1 font-semibold text-ink">{inv.buyerName}</p>
            <p className="text-muted">{inv.buyerAddress}</p>
            {inv.buyerPhone && <p className="text-muted">{inv.buyerPhone}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Place of supply</p>
            <p className="mt-1 font-semibold text-ink">
              {inv.buyerState} ({inv.placeOfSupplyStateCode})
            </p>
            <p className="text-muted">{intra ? "Within the state (CGST + SGST)" : "Between states (IGST)"}</p>
            <p className="text-muted">
              Seller state: {inv.sellerState} ({inv.sellerStateCode})
            </p>
          </div>
        </div>

        {/* Lines: a table that scrolls sideways inside its box on phones (the page itself never does). */}
        <div className="-mx-5 overflow-x-auto px-5 py-5 sm:mx-0 sm:px-0 print:overflow-visible">
          <table className="w-full min-w-[40rem] text-left text-sm print:min-w-0">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-2 font-semibold">#</th>
                <th className="py-2 pr-2 font-semibold">Item</th>
                <th className="py-2 pr-2 font-semibold">HSN</th>
                <th className="py-2 pr-2 text-right font-semibold">Qty</th>
                <th className="py-2 pr-2 text-right font-semibold">Rate</th>
                {tax && <th className="py-2 pr-2 text-right font-semibold">Taxable</th>}
                {tax && <th className="py-2 pr-2 text-right font-semibold">GST</th>}
                {tax && intra && <th className="py-2 pr-2 text-right font-semibold">CGST</th>}
                {tax && intra && <th className="py-2 pr-2 text-right font-semibold">SGST</th>}
                {tax && !intra && <th className="py-2 pr-2 text-right font-semibold">IGST</th>}
                <th className="py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.lines.map((l) => (
                <tr key={l.lineNo} className="border-b border-line/70 align-top">
                  <td className="py-2.5 pr-2 text-muted">{l.lineNo}</td>
                  <td className="py-2.5 pr-2 font-medium text-ink">{l.description}</td>
                  <td className="py-2.5 pr-2 text-muted">{l.hsnCode ?? "—"}</td>
                  <td className="py-2.5 pr-2 text-right">{l.quantity}</td>
                  <td className="py-2.5 pr-2 text-right">{num(l.unitPrice)}</td>
                  {tax && <td className="py-2.5 pr-2 text-right">{num(l.taxableValue)}</td>}
                  {tax && <td className="py-2.5 pr-2 text-right">{l.gstRate}%</td>}
                  {tax && intra && <td className="py-2.5 pr-2 text-right">{num(l.cgstAmount)}</td>}
                  {tax && intra && <td className="py-2.5 pr-2 text-right">{num(l.sgstAmount)}</td>}
                  {tax && !intra && <td className="py-2.5 pr-2 text-right">{num(l.igstAmount)}</td>}
                  <td className="py-2.5 text-right font-semibold text-ink">{num(l.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
          <p className="max-w-sm text-xs text-muted">
            Prices include GST.{tax ? " Taxable value is the amount before tax." : " Bill of supply: the seller isn't registered for GST, so no tax is charged separately."}
          </p>
          <dl className="w-full space-y-1.5 text-sm sm:w-72">
            <Line label="Items" value={money(inv.itemsTotal)} />
            {inv.discountTotal > 0 && <Line label="Discount" value={`− ${money(inv.discountTotal)}`} />}
            <Line label="Delivery" value={money(inv.deliveryFee)} />
            {tax && <Line label="Taxable value" value={money(inv.taxableTotal)} />}
            {tax && intra && <Line label="CGST" value={money(inv.cgstTotal)} />}
            {tax && intra && <Line label="SGST" value={money(inv.sgstTotal)} />}
            {tax && !intra && <Line label="IGST" value={money(inv.igstTotal)} />}
            {inv.roundOff !== 0 && <Line label="Round off" value={money(inv.roundOff)} />}
            <div className="flex items-baseline justify-between border-t border-line pt-2">
              <dt className="font-bold text-ink">Total</dt>
              <dd className="text-lg font-extrabold text-ink">{money(inv.grandTotal)}</dd>
            </div>
          </dl>
        </div>
        <p className="mt-8 text-center text-xs text-muted">This is a computer-generated {tax ? "invoice" : "bill"} and needs no signature. Sold through 360mart.in.</p>
      </article>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  );
}
