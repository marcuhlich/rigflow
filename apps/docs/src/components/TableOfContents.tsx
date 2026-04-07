import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function extractHeadings(markdown: string): TocItem[] {
  const headings: TocItem[] = [];
  const lines = markdown.split("\n");
  let inCodeBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Codeblock starten/enden
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // H1-H6 erkennen
    const match = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();

      // saubere ID generieren
      const id = text
        .toLowerCase()
        .normalize("NFD") // Akzente entfernen
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");

      headings.push({ id, text, level });
    }
  }

  return headings;
}

interface TableOfContentsProps {
  content: string;
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const headings = useMemo(() => extractHeadings(content), [content]);

  if (headings.length === 0) {
    return (
      <div className="text-sm text-red-500">
        ⚠️ Keine Überschriften gefunden für TOC
      </div>
    );
  }

  return (
    <nav className="space-y-1 border-l border-muted pl-2">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Auf dieser Seite
      </h4>
      {headings.map((h) => (
        <a
          key={h.id}
          href={`#${h.id}`}
          className={cn(
            "block text-sm py-1 text-muted-foreground hover:text-foreground transition-colors",
            h.level === 3 && "pl-4",
            h.level === 4 && "pl-8",
            h.level === 5 && "pl-12",
            h.level === 6 && "pl-16"
          )}
        >
          {h.text}
        </a>
      ))}
    </nav>
  );
}