import React from "react";

interface PublicPageLayoutProps {
  children: React.ReactNode;
}

export function PublicPageLayout({ children }: PublicPageLayoutProps) {
  return (
    <div className="min-h-screen w-full flex justify-center px-4 py-10 bg-background">
      <div className="w-full max-w-5xl">
        {children}
      </div>
    </div>
  );
}