import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Gerät-Erkennung
export function getDeviceType(): "ios" | "android" | "desktop" {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

// Prüfe ob App bereits installiert ist (PWA, Electron, etc.)
export function isAppInstalled(): boolean {
  // PWA - Standalone Mode
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  
  // iOS Safari PWA
  if ((navigator as Navigator & { standalone?: boolean }).standalone === true) return true;
  
  // Electron App - mehrere Erkennungsmethoden
  const ua = navigator.userAgent;
  if (ua.includes('RigFlowDesktop')) return true;
  if (ua.includes('Electron')) return true;
  
  // Custom window properties (falls Electron Config setzt)
  const w = window as Window & {
    isElectron?: unknown;
    __electron__?: unknown;
    __ELECTRON__?: unknown;
    electronAPI?: unknown;
  };
  if (w.isElectron || w.__electron__ || w.__ELECTRON__) return true;
  if (typeof w.electronAPI !== 'undefined') return true;
  
  return false;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => isAppInstalled());

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    // Prüfe beim Mount, ob App bereits installiert ist
    if (isAppInstalled()) {
      setIsInstalled(true);
      return;
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setIsInstalled(true);
      return outcome === "accepted";
    } catch (error) {
      // prompt() may only be called once per event – the event is unusable afterwards
      logger.warn("useInstallPrompt", "Install prompt failed", error);
      return false;
    } finally {
      setDeferredPrompt(null);
    }
  };

  return {
    canInstall: !!deferredPrompt,
    isInstalled,
    install,
    deviceType: getDeviceType(),
  };
}