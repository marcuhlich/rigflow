import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface MarkdownRendererProps {
  content: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

const components: Components = {
  h2: ({ children, ...props }) => {
    const text = typeof children === "string" ? children : String(children);
    return <h2 id={slugify(text)} {...props}>{children}</h2>;
  },
  h3: ({ children, ...props }) => {
    const text = typeof children === "string" ? children : String(children);
    return <h3 id={slugify(text)} {...props}>{children}</h3>;
  },
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose-docs">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
