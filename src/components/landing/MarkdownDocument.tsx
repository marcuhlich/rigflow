import { useEffect, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { useTranslation } from "react-i18next";
import { ErrorState, PageLoader } from "@/components/QueryState";
import { cn } from "@/lib/utils";

interface MarkdownDocumentProps {
  /** File in /public for German UI */
  deFile: string;
  /** File in /public for all other languages */
  enFile: string;
  className?: string;
  /** Hide the document's first H1 (when the page renders its own title) */
  hideTitle?: boolean;
}

type LoadState = { status: "loading" } | { status: "ready"; text: string } | { status: "error" };

const components: Components = {
  h1: ({ node: _node, ...props }) => <h1 className="mb-2 text-2xl font-semibold tracking-tight" {...props} />,
  h2: ({ node: _node, ...props }) => (
    <h2 className="mb-2 mt-10 border-b border-border pb-2 text-lg font-semibold tracking-tight" {...props} />
  ),
  h3: ({ node: _node, ...props }) => <h3 className="mb-1 mt-6 text-base font-semibold" {...props} />,
  a: ({ node: _node, ...props }) => (
    <a className="font-medium text-foreground underline underline-offset-4 hover:text-primary" {...props} />
  ),
  hr: ({ node: _node, ...props }) => <hr className="my-8 border-border" {...props} />,
  code: ({ node: _node, ...props }) => (
    <code className="rounded border border-border bg-surface-sunken px-1 py-0.5 font-mono text-[0.85em]" {...props} />
  ),
  blockquote: ({ node: _node, ...props }) => (
    <blockquote className="border-l-2 border-border-strong pl-4 not-italic text-muted-foreground" {...props} />
  ),
};

/** Fetches a markdown document from /public (per language) and renders it as readable prose. */
export function MarkdownDocument({ deFile, enFile, className, hideTitle }: MarkdownDocumentProps) {
  const { i18n } = useTranslation();
  const file = i18n.language.startsWith("de") ? deFile : enFile;
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    fetch(file, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.text();
      })
      .then((text) => setState({ status: "ready", text }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setState({ status: "error" });
      });
    return () => controller.abort();
  }, [file, attempt]);

  if (state.status === "loading") return <PageLoader />;
  if (state.status === "error") {
    return <ErrorState onRetry={() => setAttempt((a) => a + 1)} />;
  }

  return (
    <article
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert user-select-text",
        "prose-p:leading-relaxed prose-p:text-foreground/90 prose-li:text-foreground/90 prose-strong:text-foreground",
        hideTitle && "[&>h1:first-child]:hidden",
        className
      )}
    >
      <ReactMarkdown components={components}>{state.text}</ReactMarkdown>
    </article>
  );
}
