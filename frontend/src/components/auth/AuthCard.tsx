import type { ReactNode } from "react";

type Props = { badge: string; title: string; subtitle: string; children: ReactNode; footer?: ReactNode };

export function AuthCard({ badge, title, subtitle, children, footer }: Props) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <div className="rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
        <p className="inline-block rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-deep">{badge}</p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
    </div>
  );
}

export function FormMessage({ error, notice }: { error?: ReactNode; notice?: ReactNode }) {
  if (error) {
    return (
      <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </p>
    );
  }
  if (notice) {
    return (
      <p role="status" className="rounded-xl bg-fresh-soft px-4 py-3 text-sm text-fresh">
        {notice}
      </p>
    );
  }
  return null;
}

export function TestModeHint({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-brand/50 bg-brand-soft/50 px-4 py-3 text-xs text-brand-deep">
      <strong>Local testing:</strong> {children}
    </div>
  );
}

// Local development only: no SMS is sent yet, the backend prints the code.
export function LocalOtpHint() {
  if (process.env.NODE_ENV !== "development") return null;
  return (
    <TestModeHint>
      no SMS is sent locally. Find the code in the backend log: <code>docker logs mart360-api</code>
    </TestModeHint>
  );
}
