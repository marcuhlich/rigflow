import { ReactNode } from "react";
import { useLocation } from "react-router-dom";

/**
 * Short fade/translate on route change (uses the global `animate-page` utility, ≤ 200ms).
 * Note: AppLayout already animates its outlet; only use this for content outside the shell.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-page">
      {children}
    </div>
  );
}
