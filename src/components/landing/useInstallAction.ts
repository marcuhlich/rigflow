import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { isNative } from "@/services/platform";

/**
 * Shared "install app" behaviour for marketing pages: Android uses the
 * browser's install prompt when available, everything else goes to /install.
 */
export function useInstallAction() {
  const navigate = useNavigate();
  const { canInstall, isInstalled, install, deviceType } = useInstallPrompt();

  const handleInstall = useCallback(async () => {
    if (deviceType === "android" && canInstall) {
      try {
        const accepted = await install();
        if (!accepted) navigate("/install");
      } catch {
        navigate("/install");
      }
      return;
    }
    navigate("/install");
  }, [deviceType, canInstall, install, navigate]);

  return { showInstall: !isInstalled && !isNative(), handleInstall };
}
