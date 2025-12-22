import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function HelpPage() {
  const [markdown, setMarkdown] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/guide.md")
      .then((res) => res.text())
      .then((text) => setMarkdown(text))
      .catch((err) =>
        setMarkdown("# Fehler\nMarkdown konnte nicht geladen werden.")
      );
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" /> Zurück
      </Button>

      <Card className="p-6 glass-card bg-background/80">


        <div className="prose prose-sm dark:prose-invert text-foreground max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }) => (
                <h1 className="text-foreground font-bold text-2xl mb-2" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="text-foreground font-bold text-xl mt-4 mb-2" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-foreground font-semibold text-lg mt-3 mb-1" {...props} />
              ),
              strong: ({ node, ...props }) => (
                <strong className="text-foreground font-semibold" {...props} />
              ),
              li: ({ node, ...props }) => (
                <li className="text-foreground" {...props} />
              ),
            }}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      </Card>
    </div>
  );
}
