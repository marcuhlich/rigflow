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

    App.addListener("backButton", () => {
      if (location.pathname !== "/") {
        navigate(-1);
      } else {
        App.exitApp();
      }
    }).then(h => {
      handle = h;
    });

    // Optional chaining → kein Throw wenn Cleanup vor Promise-Auflösung läuft
    return () => { handle?.remove(); };

  }, [location.pathname, navigate]); // pathname statt location-Objekt → weniger Re-Registrierungen

  return null;
}