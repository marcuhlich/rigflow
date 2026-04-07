import { Link } from "react-router-dom";
import { TopNav } from "@/components/TopNav";
import { getAllDocs } from "@/content/registry";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Code, QrCode, Rocket } from "lucide-react";

const quickLinks = [
  {
    title: "Erste Schritte",
    description: "Starte mit RigFlow in wenigen Minuten",
    icon: Rocket,
    href: "/docs/getting-started",
  },
  {
    title: "Inventar",
    description: "Equipment verwalten und organisieren",
    icon: BookOpen,
    href: "/docs/inventory/overview",
  },
  {
    title: "QR Scanning",
    description: "Equipment blitzschnell scannen",
    icon: QrCode,
    href: "/docs/inventory/qr-scanning",
  },
  {
    title: "API Referenz",
    description: "Programmatischer Zugriff auf RigFlow",
    icon: Code,
    href: "/docs/api/reference",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen">
      <TopNav />

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full mb-6 glow">
              v2.0 Dokumentation
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              RigFlow{" "}
              <span className="text-primary glow-text inline sm:hidden">Docs</span>
              <span className="text-primary glow-text hidden sm:inline">Dokumentation</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
              Alles was du brauchst, um RigFlow zu meistern. Von den Grundlagen
              bis zur API – hier findest du alle Antworten.
            </p>
            <Link
              to="/docs/getting-started"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity glow"
            >
              Loslegen
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="pb-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickLinks.map((link, i) => (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
              >
                <Link
                  to={link.href}
                  className="glass group flex items-start gap-4 p-5 rounded-xl hover:border-primary/30 transition-all"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <link.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {link.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {link.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto mt-1 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
