import { useState } from "react";
import { Button } from "@/components/ui/button";
import { setAnalyticsConsent, initializePostHog } from "@/lib/consentUtils";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ConsentScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConsentScreen({ isOpen, onClose }: ConsentScreenProps) {
  const [processing, setProcessing] = useState<"accept" | "decline" | null>(null);
  const isMobile = useIsMobile();

  if (!isOpen) return null;

  const handleConsent = async (consentGiven: boolean) => {
    setProcessing(consentGiven ? "accept" : "decline");
    try {
      setAnalyticsConsent(consentGiven);
      initializePostHog();
      onClose();
    } catch {
      // Fehler still ignorieren, aber Processing zurücksetzen
    } finally {
      setProcessing(null);
    }
  };

  // Mobile: Full-screen modal with backdrop
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-4 pt-12 sm:pt-4">
        <div className="w-full max-w-md bg-slate-800/95 backdrop-blur border border-slate-700 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[70vh]">
          {/* Content - scrollable */}
          <div className="overflow-y-auto flex-1 p-6 space-y-4">
            {/* Header */}
            <div className="space-y-2 text-center">
              <h1 className="text-lg font-bold text-white">Analytik & Datenschutz</h1>
              <p className="text-xs text-slate-400">
                Hilf uns, die App zu verbessern
              </p>
            </div>

            {/* Content */}
            <div className="space-y-3 text-slate-300 text-xs">
              <p>
                Wir verwenden <strong>PostHog Analytics</strong>, um Fehler zu finden und deine Erfahrung zu optimieren. Deine Daten sind dir eigen.
              </p>
              
              <div className="bg-slate-700/50 rounded p-2.5 space-y-1.5">
                <p className="font-semibold text-slate-200 text-xs">✓ Mit Analytik:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>Fehler schneller beheben</li>
                  <li>Bessere Features</li>
                </ul>
              </div>

              <div className="bg-slate-700/50 rounded p-2.5 space-y-1.5">
                <p className="font-semibold text-slate-200 text-xs">🔒 Privat:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>Keine Datenerfassung</li>
                </ul>
              </div>

              <p className="text-xs pt-1 text-slate-400">
                <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                  Datenschutz
                </a>
              </p>
            </div>
          </div>

          {/* Actions - always visible at bottom */}
          <div className="flex gap-2 p-4 border-t border-slate-700 bg-slate-800/50 flex-shrink-0">
            <Button onClick={() => handleConsent(false)} disabled={processing !== null}>
              {processing === "decline" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Ablehnen"}
            </Button>
            <Button onClick={() => handleConsent(true)} disabled={processing !== null}>
              {processing === "accept" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Akzeptieren"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop: Cookie banner at the bottom (no backdrop - see through to page behind)
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 flex justify-center pointer-events-none">
      <div className="max-w-4xl w-full bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg shadow-2xl p-5 pointer-events-auto">
        <div className="flex items-start justify-between gap-6">
          {/* Content */}
          <div className="flex-1 space-y-3">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-white">Analytik & Datenschutz</h2>
              <p className="text-xs text-slate-400">
                Wir verwenden PostHog Analytics, um die App zu verbessern. Deine Daten sind dir eigen – nur anonymisierte Events werden übertragen.{" "}
                <a href="/datenschutz" target="_blank" rel="noopener noreferrer"className="text-blue-400 hover:underline">
                  Mehr erfahren
                </a>
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-shrink-0">
            <Button onClick={() => handleConsent(false)} disabled={processing !== null}>
              {processing === "decline" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Ablehnen"}
            </Button>
            <Button onClick={() => handleConsent(true)} disabled={processing !== null}>
              {processing === "accept" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Akzeptieren"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
