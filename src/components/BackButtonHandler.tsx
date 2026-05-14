import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { App } from "@capacitor/app";
import { isNative } from "@/services/platform";

export default function BackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Nur auf nativen Plattformen (iOS/Android) registrieren
    if (!isNative()) return;

    // Handle erst nach Promise-Auflösung setzen – selbes Muster wie in App.tsx
    let handle: { remove: () => Promise<void> } | undefined;
    let cancelled = false;

    App.addListener("backButton", () => {
      if (location.pathname === "/") {
        App.exitApp();
      } else if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/", { replace: true });
      }
    }).then(h => {
      if (cancelled) {
        h.remove();  // Zu spät – sofort wieder entfernen
      } else {
        handle = h;
      }
    });

    return () => {
      cancelled = true;
      handle?.remove();
    };

  }, [location.pathname, navigate]); // pathname statt location-Objekt → weniger Re-Registrierungen

  return null;
}