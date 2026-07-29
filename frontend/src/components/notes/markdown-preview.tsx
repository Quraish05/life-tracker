import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Element-level styling for rendered markdown (no typography plugin in play).
const components: Components = {
  h1: (props) => <h1 className="mt-5 mb-2 text-2xl font-bold text-foreground" {...props} />,
  h2: (props) => <h2 className="mt-5 mb-2 text-xl font-bold text-foreground" {...props} />,
  h3: (props) => <h3 className="mt-4 mb-1.5 text-lg font-semibold text-foreground" {...props} />,
  p: (props) => <p className="my-2.5 leading-relaxed text-foreground/90" {...props} />,
  a: (props) => (
    <a className="font-semibold text-grape underline underline-offset-2 hover:text-grape-deep" {...props} />
  ),
  ul: (props) => <ul className="my-2.5 list-disc space-y-1 pl-6 text-foreground/90" {...props} />,
  ol: (props) => <ol className="my-2.5 list-decimal space-y-1 pl-6 text-foreground/90" {...props} />,
  li: (props) => <li className="leading-relaxed" {...props} />,
  blockquote: (props) => (
    <blockquote className="my-3 border-l-4 border-grape/30 pl-4 text-muted italic" {...props} />
  ),
  code: ({ className, ...props }) => {
    const isBlock = /language-/.test(className ?? "");
    return isBlock ? (
      <code className="text-sm text-foreground" {...props} />
    ) : (
      <code className="rounded-md bg-lilac/40 px-1.5 py-0.5 font-mono text-[0.85em] text-grape-deep" {...props} />
    );
  },
  pre: (props) => (
    <pre className="my-3 overflow-x-auto rounded-xl bg-ink/95 p-4 font-mono text-sm text-white/90" {...props} />
  ),
  hr: () => <hr className="my-5 border-border" />,
  table: (props) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props) => (
    <th className="border border-border bg-lilac/30 px-3 py-1.5 text-left font-semibold text-foreground" {...props} />
  ),
  td: (props) => <td className="border border-border px-3 py-1.5 text-foreground/90" {...props} />,
  strong: (props) => <strong className="font-bold text-foreground" {...props} />,
};

export function MarkdownPreview({ children }: { children: string }) {
  if (!children.trim()) {
    return (
      <p className="text-sm text-muted/60 italic">Nothing to preview yet.</p>
    );
  }
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
