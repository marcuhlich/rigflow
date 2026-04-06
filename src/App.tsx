import { useEffect } from "react";
import { UndoRedoProvider } from "@/contexts/UndoRedoContext";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
import { CommandPalette } from "@/components/CommandPalette";
import { PushService } from "@/lib/pushService";
import { logger } from "@/lib/logger";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import Landing from "./pages/Landing";
import InstallPrompt from "./pages/InstallPrompt";
import RegisterPage from '@/pages/RegisterPage';
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import ItemDetail from "./pages/ItemDetail";
import HelpPage from "./pages/HelpPage";
import DMXPatchplan from "./pages/DMXPatchplan";
import { ChecklistsPage } from "./pages/Checklists";
import EventSetsPage from "./pages/EventSets";
import Lending from "./pages/Lending";
import AccountSettings from "./pages/AccountSettings";
import Auth from "./pages/Auth";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";
import { useOverdueReminder } from "@/hooks/useOverdueReminder";
import AuthCallback from "./pages/AuthCallback";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AccountInfo from "./pages/settings/AccountInfo";
import Notifications from "./pages/settings/Notifications";
import NotificationTest from "./pages/dev/NotificationTest";
import PrivacySecurity from "./pages/settings/PrivacySecurity";
import Scanner from "./pages/Scanner";
import Appearance from "./pages/settings/Appearance";
import { applyStoredAppearance } from "@/lib/appearanceUtils";
import SettingsGuard from "@/components/SettingsGuard";

const queryClient = new QueryClient();

applyStoredAppearance();

function OverdueReminderInit() {
  useOverdueReminder();
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/landing", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return <AppLayout>{children}</AppLayout>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !user.user_metadata?.is_admin)) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) return null;
  if (!user || !user.user_metadata?.is_admin) return null;

  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  return (
    <Routes>

      {/* ── Public ─────────────────────────────────────────────────────── */}
      <Route path="/landing"          element={<Landing />} />
      <Route path="/auth"             element={<Auth />} />
      <Route path="/auth/callback"    element={<AuthCallback />} />
      <Route path="/register"         element={<RegisterPage />} />
      <Route path="/forgot-password"  element={<ForgotPassword />} />
      <Route path="/reset-password"   element={<ResetPassword />} />
      <Route path="/install"          element={<Install />} />
      <Route path="/install-prompt"   element={<InstallPrompt />} />

      {/* ── App ────────────────────────────────────────────────────────── */}
      <Route path="/"             element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/inventory"    element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
      <Route path="/inventory/:id" element={<ProtectedRoute><ItemDetail /></ProtectedRoute>} />
      <Route path="/lending"      element={<ProtectedRoute><Lending /></ProtectedRoute>} />
      <Route path="/sets"         element={<ProtectedRoute><EventSetsPage /></ProtectedRoute>} />
      <Route path="/checklists"   element={<ProtectedRoute><ChecklistsPage /></ProtectedRoute>} />
      <Route path="/dmx"          element={<ProtectedRoute><DMXPatchplan /></ProtectedRoute>} />
      <Route path="/scanner"      element={<ProtectedRoute><Scanner /></ProtectedRoute>} />
      <Route path="/help"         element={<ProtectedRoute><HelpPage /></ProtectedRoute>} />

      {/* ── Settings ───────────────────────────────────────────────────── */}
      <Route element={<ProtectedRoute><SettingsGuard /></ProtectedRoute>}>
        <Route path="/settings"                    element={<AccountSettings />} />
        <Route path="/settings/account-info"       element={<AccountInfo />} />
        <Route path="/settings/notifications"      element={<Notifications />} />
        <Route path="/settings/privacy-security"   element={<PrivacySecurity />} />
        <Route path="/settings/appearance"         element={<Appearance />} />
      </Route>

      {/* ── Dev (nur Admin) ────────────────────────────────────────────── */}
      <Route path="/dev/notifications" element={<AdminRoute><NotificationTest /></AdminRoute>} />

      {/* ── Fallback ───────────────────────────────────────────────────── */}
      <Route path="*" element={<NotFound />} />

    </Routes>
  );
}

function AppInitializer() {
  useEffect(() => {
    const init = async () => {
      // Alten leeren /sw.js deregistrieren falls noch vorhanden
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          if (reg.active?.scriptURL.endsWith('/sw.js')) {
            try {
              const response = await fetch(reg.active.scriptURL);
              const text = await response.text();
              if (text.trim().length < 100) {
                await reg.unregister();
                logger.info('App', 'Alten leeren SW deregistriert');
              }
            } catch (e) {
              // ignore
            }
          }
        }
      }

      // Initialize push service
      try {
        const initialized = await PushService.initialize({
          enableNotifications: true,
          enableBackground: true,
        });

        if (initialized) {
          logger.info("App", "Push service initialized");

          PushService.onMessage((message) => {
            logger.info("App", "Message from SW:", message.type);
            switch (message.type) {
              case "SW_UPDATE_AVAILABLE":
                logger.info("App", "Service worker update available");
                break;
              case "SYNC_START":
                logger.info("App", "Background sync started");
                break;
              default:
                break;
            }
          });
        }
      } catch (error) {
        logger.error("App", "Failed to initialize push service", error);
      }

      // SW Update Handling
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          if (registration.waiting) {
            logger.info("App", "New SW waiting, forcing activation");
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          }
        });

        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (!refreshing) {
            refreshing = true;
            logger.info("App", "SW controller changed, reloading");
            window.location.reload();
          }
        });

        navigator.serviceWorker.addEventListener("message", (event) => {
          if (event.data?.type === "FORCE_RELOAD") {
            logger.info("App", "SW requested force reload");
            setTimeout(() => {
              window.location.href = window.location.href.split("?")[0];
            }, 200);
          }
        });
      }
    };

    init();

    // Offline / Online Notifications wurden entfernt, da sie oft mehr stören als nützen. Stattdessen setzen wir auf regelmäßige SW-Update-Checks, um die App aktuell zu halten.

    // SW Update Check bei Visibility Change
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        logger.info("App", "App visible, checking for SW updates");
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) await registration.update();
        } catch (error) {
          logger.error("App", "Failed to check for SW updates", error);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    handleVisibilityChange();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UndoRedoProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppInitializer />
              <OverdueReminderInit />
              <CommandPalette />
              <AppRoutes />
            </BrowserRouter>
            <SpeedInsights />
            <Analytics />
          </TooltipProvider>
        </UndoRedoProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;