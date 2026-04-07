import { useParams } from "react-router-dom";
import { getDocBySlug, DocPage } from "@/content/registry";
import { DocsSidebar } from "@/components/DocsSidebar";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { TableOfContents } from "@/components/TableOfContents";
import { TopNav } from "@/components/TopNav";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function DocsPage() {
  const params = useParams();
  const slug = params["*"] || "getting-started";

  const [doc, setDoc] = useState<DocPage | undefined>(undefined);

  useEffect(() => {
    getDocBySlug(slug).then((res) => setDoc(res as DocPage));
  }, [slug]);

  if (!doc) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <div className="pt-20 md:pt-24 container mx-auto px-4 md:px-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">Seite nicht gefunden</h1>
          <p className="text-muted-foreground mt-2">
            Die angeforderte Dokumentation existiert nicht oder wird geladen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopNav />
      <div className="pt-20 md:pt-24 container mx-auto px-4 md:px-6 pb-16">
        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <div className="hidden md:block">
            <DocsSidebar />
          </div>

          <motion.main
            key={slug}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 min-w-0"
          >
            <div className="glass rounded-xl p-5 md:p-8">
              {doc.description && (
                <p className="text-muted-foreground text-sm mb-6 pb-4 border-b border-border">
                  {doc.description}
                </p>
              )}

              {/* Mobile TOC */}
              <div className="lg:hidden mb-6 glass-subtle rounded-lg p-4">
                <TableOfContents content={doc?.content || ""} />
              </div>

              <MarkdownRenderer content={doc?.content || ""} />
            </div>
          </motion.main>

          {/* Desktop TOC */}
          <aside className="hidden lg:block w-48 shrink-0 sticky top-24 h-fit">
            <div className="glass-subtle rounded-lg p-4">
              <TableOfContents content={doc.content || ""} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}