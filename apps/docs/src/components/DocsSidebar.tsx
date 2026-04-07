import { Link, useLocation } from "react-router-dom";
import { getDocCategories } from "@/content/registry";
import { ChevronRight, FileText, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function DocsSidebar() {
  const categories = getDocCategories();
  const location = useLocation();
  const currentSlug = location.pathname.replace("/docs/", "");

  return (
    <aside className="w-64 shrink-0 glass-subtle rounded-lg p-4 h-fit sticky top-24">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        Dokumentation
      </h3>
      <nav className="space-y-4">
        {categories.map((category) => (
          <CategoryGroup
            key={category.slug}
            name={category.name}
            pages={category.pages}
            currentSlug={currentSlug}
          />
        ))}
      </nav>
    </aside>
  );
}

function CategoryGroup({
  name,
  pages,
  currentSlug,
}: {
  name: string;
  pages: { slug: string; title: string }[];
  currentSlug: string;
}) {
  const isActive = pages.some((p) => p.slug === currentSlug);
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            open && "rotate-90"
          )}
        />
        <FolderOpen className="h-3.5 w-3.5" />
        <span>{name}</span>
      </button>
      {open && (
        <ul className="mt-1.5 ml-3 space-y-0.5 border-l border-border pl-3">
          {pages.map((page) => (
            <li key={page.slug}>
              <Link
                to={`/docs/${page.slug}`}
                className={cn(
                  "flex items-center gap-2 text-sm py-1.5 px-2 rounded-md transition-colors",
                  currentSlug === page.slug
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{page.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
