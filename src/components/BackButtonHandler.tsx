import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App } from "@capacitor/app";
import { isNative } from "@/services/platform";
import { logger } from "@/lib/logger";

/** Topmost open Radix dialog / sheet / alert dialog, if any. */
function findOpenModal(): HTMLElement | null {
  const open = document.querySelectorAll<HTMLElement>(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'
  );
  return open.length ? open[open.length - 1] : null;
}

/**
 * Android hardware back button (native only):
 * 1. closes an open dialog/sheet (e.g. the scanner) via Escape,
 * 2. otherwise navigates back,
 * 3. exits the app on the start page.
 */
export default function BackButtonHandler() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Keep the latest values without re-registering the native listener
  const pathRef = useRef(pathname);
  const navigateRef = useRef(navigate);
  useEffect(() => { pathRef.current = pathname; }, [pathname]);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  useEffect(() => {
    if (!isNative()) return;

    let handle: { remove: () => Promise<void> } | undefined;
    let cancelled = false;

    App.addListener("backButton", () => {
      const modal = findOpenModal();
      if (modal) {
        // Radix closes dialogs on Escape keydown on the document
        modal.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
        return;
      }
      if (pathRef.current === "/") {
        App.exitApp().catch((err: unknown) => logger.error("BackButtonHandler", "exitApp failed", err));
      } else if (window.history.length > 1) {
        navigateRef.current(-1);
      } else {
        navigateRef.current("/", { replace: true });
      }
    })
      .then((h) => {
        if (cancelled) void h.remove().catch(() => undefined);
        else handle = h;
      })
      .catch((err: unknown) => logger.error("BackButtonHandler", "addListener failed", err));

    return () => {
      cancelled = true;
      void handle?.remove().catch(() => undefined);
    };
  }, []);

  return null;
}
