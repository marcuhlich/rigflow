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
      .then((res) => {
        if (!res.ok) throw new Error("Network error");
        return res.text();
      })
      .then((text) => setMarkdown(text))
      .catch(() =>
        setMarkdown("# Anleitung nicht verfügbar\nDie Anleitung konnte nicht geladen werden. Bitte stelle sicher, dass du online bist, oder versuche es später erneut.")
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


        <div className="prose prose-sm dark:prose-invert max-w-none [&_*]:text-foreground">
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }) => (
                <h1 className="!text-foreground font-bold text-2xl mb-2" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="!text-foreground font-bold text-xl mt-6 mb-2 pb-1 border-b border-border/50" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="!text-foreground font-semibold text-lg mt-3 mb-1" {...props} />
              ),
              p: ({ node, ...props }) => (
                <p className="!text-foreground/90" {...props} />
              ),
              strong: ({ node, ...props }) => (
                <strong className="!text-foreground font-semibold" {...props} />
              ),
              li: ({ node, ...props }) => (
                <li className="!text-foreground/90" {...props} />
              ),
              a: ({ node, ...props }) => (
                <a className="!text-primary hover:underline" {...props} />
              ),
              blockquote: ({ node, ...props }) => (
                <blockquote className="!text-foreground/70 border-l-2 border-primary/50 pl-4 italic" {...props} />
              ),
              hr: ({ node, ...props }) => (
                <hr className="!border-border/50 my-6" {...props} />
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
