"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog } from "@/components/Dialog";
import { emptyListingDraft } from "@/lib/inventory/validation";
import { ListingForm } from "./ListingForm";
import { ProductThumb } from "./ListingParts";

// "Add" on one size of a catalogue product: the listing form in a dialog. When
// it's listed, the product's own page opens (to add stock or check details).
export function AddSizeButton({ variantId, productName, sizeLabel, imageUrl }: { variantId: number; productName: string; sizeLabel: string; imageUrl: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white transition hover:bg-ink/85">
        <Plus aria-hidden className="size-4" />
        Add
        <span className="sr-only">
          {productName} {sizeLabel}
        </span>
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Start selling" description="Set your price and stock for this size.">
        {open && (
          <>
            <div className="mb-5 flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
              <ProductThumb src={imageUrl} name={productName} className="size-12 rounded-xl" />
              <div className="min-w-0">
                <p className="truncate font-bold text-ink">{productName}</p>
                <p className="text-sm text-muted">{sizeLabel}</p>
              </div>
            </div>
            <ListingForm
              mode="create"
              variantId={variantId}
              initial={emptyListingDraft()}
              onCancel={() => setOpen(false)}
              onCreated={(listingId) => {
                setOpen(false);
                if (listingId) router.push(`/seller/products/${listingId}`);
                else router.refresh();
              }}
            />
          </>
        )}
      </Dialog>
    </>
  );
}
