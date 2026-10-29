import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { MarketingHeader } from "./MarketingHeader";
import { MarketingFooter } from "./MarketingFooter";

/** Page frame for public marketing pages: header, content, footer. */
export function MarketingLayout({ children }: { children: ReactNode }) {
  const { hash, pathname } = useLocation();

  // In-page anchors (/landing#features) must also work after a route change.
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash, pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
