import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { getDocCategories } from "@/content/registry";
import { Workflow, Menu, X } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { DocsSidebar } from "@/components/DocsSidebar";

export function TopNav() {
  const location = useLocation();
  const categories = getDocCategories();
  const isHome = location.pathname === "/";
  const isDocs = location.pathname.startsWith("/docs");

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto flex items-center justify-between h-14 md:h-16 px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-primary/10 flex items-center justify-center glow">
            <Workflow className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          </div>
          <span className="text-base md:text-lg font-bold text-foreground group-hover:text-primary transition-colors">
            RigFlow
          </span>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            Docs
          </span>
        </Link>

        {/* Desktop nav */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link to="/">
                <NavigationMenuLink
                  className={cn(
                    "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
                    isHome
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Home
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger
                className={cn(
                  "text-sm bg-transparent",
                  isDocs ? "text-primary" : "text-muted-foreground"
                )}
              >
                Dokumentation
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="grid gap-1 p-4 w-[320px]">
                  {categories.map((cat) =>
                    cat.pages.map((page) => (
                      <Link
                        key={page.slug}
                        to={`/docs/${page.slug}`}
                        className="block rounded-md p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="text-sm font-medium text-foreground">
                          {page.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {page.description}
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger className="md:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-background border-border p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="p-4 border-b border-border">
              <Link to="/" className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Workflow className="h-4 w-4 text-primary" />
                </div>
                <span className="text-base font-bold text-foreground">RigFlow</span>
              </Link>
            </div>
            <div className="p-4 space-y-4">
              <Link
                to="/"
                className={cn(
                  "block text-sm font-medium py-2 px-3 rounded-md transition-colors",
                  isHome ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Home
              </Link>
              <DocsSidebar />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
