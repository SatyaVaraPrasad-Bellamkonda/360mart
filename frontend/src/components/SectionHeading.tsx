import type { ReactNode } from "react";

type Props = { id: string; title: string; subtitle?: string; action?: ReactNode };

export function SectionHeading({ id, title, subtitle, action }: Props) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4 sm:mb-6">
      <div>
        <h2 id={id} className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
