import type { Faq } from "@/lib/types";

// Native <details> accordions: no JavaScript needed, and every answer is in
// the HTML so search engines can read it.
export function FaqSection({ title, faqs }: { title: string; faqs: Faq[] }) {
  if (faqs.length === 0) return null;

  return (
    <section aria-labelledby="faq-heading">
      <h2 id="faq-heading" className="text-xl font-bold text-ink">
        {title}
      </h2>
      <div className="mt-4 divide-y divide-line rounded-2xl border border-line bg-white">
        {faqs.map((faq) => (
          <details key={faq.question} className="group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink">
              {faq.question}
              <span aria-hidden className="text-muted transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
