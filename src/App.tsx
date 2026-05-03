import { useEffect, lazy, Suspense } from "react";
import { UndoRedoProvider } from "@/contexts/UndoRedoContext";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
import { CommandPalette } from "@/components/CommandPalette";
import { PushService } from "@/lib/pushService";
import { logger } from "@/lib/logger";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { Loader2 } from "lucide-react";
import { useOverdueReminder } from "@/hooks/useOverdueReminder";
import { applyStoredAppearance } from "@/lib/appearanceUtils";
import SettingsGuard from "@/components/SettingsGuard";
import { PublicPageLayout } from "./components/layout/PublicPageLayout";
import { isNative } from '@/services/platform';

const Landing = lazy(() => import("./pages/Landing"));
const InstallPrompt = lazy(() => import("./pages/InstallPrompt"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const Auth = lazy(() => import("./pages/Auth"));
const Install = lazy(() => import("./pages/Install"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Inventory = lazy(() => import("./pages/Inventory"));
const ItemDetail = lazy(() => import("./pages/ItemDetail"));
const Lending = lazy(() => import("./pages/Lending"));
const ProjectsPage = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const DMXPatchplan = lazy(() => import("./pages/DMXPatchplan"));
const Scanner = lazy(() => import("./pages/Scanner"));
const HelpPage = lazy(() => import("./pages/HelpPage"));
const Datenschutz = lazy(() => import("./pages/Datenschutz"));
const Impressum = lazy(() => import("./pages/Impressum"));
// Settings
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const AccountInfo = lazy(() => import("./pages/settings/AccountInfo"));
const Notifications = lazy(() => import("./pages/settings/Notifications"));
const PrivacySecurity = lazy(() => import("./pages/settings/PrivacySecurity"));
const Appearance = lazy(() => import("./pages/settings/Appearance"));
// Dev
const NotificationTest = lazy(() => import("./pages/dev/NotificationTest"));
const HapticsTest = lazy(() => import("./pages/dev/Haptics"));


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
    },
  },
});

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
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
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
      <Route path="/impressum"        element={<PublicPageLayout><Impressum /></PublicPageLayout>}/>
      <Route path="/datenschutz"        element={<PublicPageLayout><Datenschutz /></PublicPageLayout>}/>

      {/* ── App ────────────────────────────────────────────────────────── */}
      <Route path="/"             element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/inventory"    element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
      <Route path="/inventory/:id" element={<ProtectedRoute><ItemDetail /></ProtectedRoute>} />
      <Route path="/lending"      element={<ProtectedRoute><Lending /></ProtectedRoute>} />
      <Route path="/projects"   element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
      <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
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
      <Route path="/dev/haptics" element={<AdminRoute><HapticsTest /></AdminRoute>} />

      {/* ── Fallback ───────────────────────────────────────────────────── */}
      <Route path="*" element={<NotFound />} />

    </Routes>
    </Suspense>
  );
}

function AppInitializer() {
  useEffect(() => {
    const init = async () => {
      // Auf nativen Plattformen kein Service Worker
      if (isNative()) return;
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
      if (isNative()) return;
      if (document.visibilityState === 'visible') {
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