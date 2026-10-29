import { ReactNode } from "react";
import { isNative } from "@/services/platform";
import { MarketingHeader } from "@/components/landing/MarketingHeader";
import { MarketingFooter } from "@/components/landing/MarketingFooter";

interface PublicPageLayoutProps {
  children: ReactNode;
}

/** Frame for public content pages (legal documents). Native app gets a bare column. */
export function PublicPageLayout({ children }: PublicPageLayoutProps) {
  const native = isNative();
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {!native && <MarketingHeader />}
      <main className={native ? "flex-1 px-4 pb-safe pt-safe" : "flex-1 px-4 py-10 sm:px-6 sm:py-14"}>
        <div className={native ? "py-4" : undefined}>{children}</div>
      </main>
      {!native && <MarketingFooter />}
    </div>
  );
}
