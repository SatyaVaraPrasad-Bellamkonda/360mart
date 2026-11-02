import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// A policy's Markdown as plain React elements. HTML in the text is dropped
// (skipHtml, no rehype-raw), so nothing typed into a policy can become a
// script or a form; react-markdown also removes unsafe link targets
// (javascript: and the like). Used by the public pages and the admin preview.

const components: Components = {
  h1: ({ children }) => <h2 className="mt-10 scroll-mt-24 text-2xl font-extrabold tracking-tight text-ink first:mt-0">{children}</h2>,
  h2: ({ children }) => <h2 className="mt-10 scroll-mt-24 text-xl font-bold tracking-tight text-ink first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-8 text-lg font-bold text-ink">{children}</h3>,
  h4: ({ children }) => <h4 className="mt-6 font-bold text-ink">{children}</h4>,
  h5: ({ children }) => <h5 className="mt-6 font-semibold text-ink">{children}</h5>,
  h6: ({ children }) => <h6 className="mt-6 font-semibold text-ink">{children}</h6>,
  p: ({ children }) => <p className="mt-4 leading-7 text-ink/85">{children}</p>,
  ul: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-6 leading-7 text-ink/85 marker:text-brand-deep">{children}</ul>,
  ol: ({ children }) => <ol className="mt-4 list-decimal space-y-2 pl-6 leading-7 text-ink/85 marker:font-semibold marker:text-ink">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  a: ({ href, children }) => {
    const external = !!href && /^https?:\/\//i.test(href);
    return (
      <a href={href} className="font-semibold text-brand-deep underline decoration-brand/40 underline-offset-2 hover:decoration-brand-deep" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {children}
      </a>
    );
  },
  strong: ({ children }) => <strong className="font-bold text-ink">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => <blockquote className="mt-4 rounded-r-2xl border-l-4 border-brand bg-brand-soft/40 px-4 py-1 text-ink/85">{children}</blockquote>,
  hr: () => <hr className="my-8 border-line" />,
  code: ({ children }) => <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[0.9em] text-ink">{children}</code>,
  pre: ({ children }) => <pre className="mt-4 overflow-x-auto rounded-2xl bg-surface p-4 text-sm">{children}</pre>,
  table: ({ children }) => (
    <div className="mt-4 overflow-x-auto rounded-2xl ring-1 ring-line">
      <table className="w-full min-w-[28rem] text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-surface text-ink">{children}</thead>,
  th: ({ children }) => <th className="px-3 py-2 font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-t border-line px-3 py-2 align-top text-ink/85">{children}</td>,
  img: () => null, // policies are text; pictures from other sites would be hot-linked
};

export function PolicyMarkdown({ content }: { content: string }) {
  return (
    <div className="min-w-0 break-words text-base">
      <Markdown remarkPlugins={[remarkGfm]} skipHtml components={components}>
        {content}
      </Markdown>
    </div>
  );
}
