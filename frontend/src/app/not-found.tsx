import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-6xl" aria-hidden>🧺</p>
      <h1 className="mt-4 text-2xl font-bold text-ink">Page not found</h1>
      <p className="mt-2 text-muted">We couldn&apos;t find what you were looking for.</p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-ink px-6 py-3 font-semibold text-white">
        Back to home
      </Link>
    </section>
  );
}
