"use client";

import { useEffect } from "react";
import { rememberSearch } from "@/lib/search/recent";

/** Adds a search that opened the results page (typed in the address bar, a trending chip…) to the device's recent list. */
export function RememberSearch({ q }: { q: string }) {
  useEffect(() => rememberSearch(q), [q]);
  return null;
}
