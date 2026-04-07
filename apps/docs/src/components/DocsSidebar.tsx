import { Link, useLocation } from "react-router-dom";
import { getDocCategories, DocCategory, DocPage } from "@/content/registry";
import { ChevronRight, FileText, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

// Node für rekursive Sidebar-Struktur
interface SidebarNode {
  name: string;
  slug?: string;
  children?: SidebarNode[];
  doc?: DocPage;
}

export function DocsSidebar() {
  const [categories, setCategories] = useState<DocCategory[]>([]);
  const location = useLocation();
  const currentSlug = location.pathname.split("/docs/")[1] || "";

  useEffect(() => {
    getDocCategories().then((res) => setCategories(res));
  }, []);

  // Build nodes für jeden Category + Subfolder
  const buildNodes = (category: DocCategory): SidebarNode => {
    const root: SidebarNode = { name: category.name, children: [] };

    category.pages.forEach((doc) => {
      const parts = doc.slug.split("/");
      let current = root;

      parts.forEach((part, idx) => {
        let child = current.children!.find((c) => c.name === part);
        if (!child) {
          child = {
            name: part,
            children: idx === parts.length - 1 ? undefined : [],
            slug: idx === parts.length - 1 ? doc.slug : undefined,
            doc: idx === parts.length - 1 ? doc : undefined,
          };
          current.children!.push(child);
        }
        if (child.children) current = child;
      });
    });

    return root;
  };

  return (
    <aside className="w-64 shrink-0 glass-subtle rounded-lg p-4 h-fit sticky top-24">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        Dokumentation
      </h3>
      <nav className="space-y-4">
        {categories.map((cat) => (
          <SidebarNodeComponent
            key={cat.slug}
            node={buildNodes(cat)}
            currentSlug={currentSlug}
          />
        ))}
      </nav>
    </aside>
  );
}

// Rekursive Komponente
function SidebarNodeComponent({
  node,
  currentSlug,
  level = 0,
}: {
  node: SidebarNode;
  currentSlug: string;
  level?: number;
}) {
  const isActive = node.slug === currentSlug;
  const [open, setOpen] = useState(
    node.children ? node.children.some((c) => currentSlug.startsWith(c.slug || "")) : false
  );

  if (node.children && node.children.length > 0) {
    return (
      <div className="ml-[calc(theme(spacing.1)*level)]">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
          <FolderOpen className="h-3.5 w-3.5" />
          <span>{node.name}</span>
        </button>
        {open && (
          <ul className="mt-1.5 ml-3 space-y-0.5 border-l border-border pl-3">
            {node.children.map((child) => (
              <SidebarNodeComponent key={child.slug || child.name} node={child} currentSlug={currentSlug} level={level + 1} />
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <Link
      to={`/docs/${node.slug}`}
      className={cn(
        "flex items-center gap-2 text-sm py-1.5 px-2 rounded-md transition-colors",
        isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      <FileText className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{node.doc?.title || node.name}</span>
    </Link>
  );
}