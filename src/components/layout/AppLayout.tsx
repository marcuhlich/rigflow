import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Package, Sliders, CheckSquare, Boxes } from "lucide-react";
import { UserMenu } from "@/components/UserMenu";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", mobileLabel: "Home" },
  { to: "/inventory", icon: Package, label: "Inventar", mobileLabel: "Inventar" },
  { to: "/checklists", icon: CheckSquare, label: "Checklisten", mobileLabel: "Checks" },
  { to: "/dmx", icon: Sliders, label: "DMX Patchplan", mobileLabel: "DMX" },
];

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/pwa-192x192.png"
              alt="Rigflow Logo"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover"
            />
            <div>
              <h1 className="text-sm sm:text-base font-semibold tracking-tight leading-tight">
                Rigflow
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Inventarverwaltung</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <UserMenu />
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around px-2 py-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors min-w-[56px]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.mobileLabel}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-3 sm:p-4 md:p-8 overflow-x-hidden pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto w-full">{children}</div>
      </main>

      {/* Offline Indicator */}
      <OfflineIndicator />
    </div>
  );
}
