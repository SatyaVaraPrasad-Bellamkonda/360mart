import type { ReactNode } from "react";

// The save button area of each step. On phones it sticks to the bottom of the
// screen, so saving never needs a long scroll; from sm up it sits after the form.
export function ActionBar({ note, children }: { note?: ReactNode; children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:rounded-3xl sm:border sm:bg-white sm:p-4 sm:backdrop-blur-none">
      {note && <p className="mb-2 text-xs text-muted sm:mb-0 sm:text-sm">{note}</p>}
      <div className="sm:ml-auto sm:w-64 sm:shrink-0">{children}</div>
    </div>
  );
}
