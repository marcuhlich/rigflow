import { useEffect, lazy, Suspense, useState } from "react";
import { UndoRedoProvider } from "@/contexts/UndoRedoContext";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ErrorBoundary, RouteErrorBoundary } from "@/components/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
import { CommandPalette } from "@/components/CommandPalette";
import { PushService } from "@/lib/pushService";
import { logger } from "@/lib/logger";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { PageLoader } from "@/components/QueryState";
import { useOverdueReminder } from "@/hooks/useOverdueReminder";
import { applyStoredAppearance } from "@/lib/appearanceUtils";
import SettingsGuard from "@/components/SettingsGuard";
import { PublicPageLayout } from "./components/layout/PublicPageLayout";
import { isNative } from '@/services/platform';
import BackButtonHandler from "./components/BackButtonHandler";
import { App as CapApp } from '@capacitor/app';
import ConsentScreen from "./pages/ConsentScreen";
import { useLanguageDetection } from './hooks/useLanguageDetection';
import { supabase } from '@/integrations/supabase/client';
import { ANALYTICS_CONSENT_KEY, ONBOARDING_DONE_KEY } from '@/lib/constants';

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
const Nutzungsbedingungen = lazy(() => import("./pages/Nutzungsbedingungen"));
const NativeOnboarding = lazy(() => import("./pages/NativeOnboarding"));
// Settings
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const AccountInfo = lazy(() => import("./pages/settings/AccountInfo"));
const Notifications = lazy(() => import("./pages/settings/Notifications"));
const PrivacySecurity = lazy(() => import("./pages/settings/PrivacySecurity"));
const Appearance = lazy(() => import("./pages/settings/Appearance"));
const AboutRigFlow = lazy(() => import("./pages/settings/AboutRigFlow"));
const WunschlisteTab = lazy(() => import("./pages/settings/WunschlisteTab"));
// Features
const DMX = lazy(() => import("./pages/features/DMXWorkflow"));
const ScannerWorkflow = lazy(() => import("./pages/features/ScannerWorkflow"));
const Service = lazy(() => import("./pages/features/ServiceInstandhaltung"));
// Dev
const NotificationTest = lazy(() => import("./pages/dev/NotificationTest"));
const HapticsTest = lazy(() => import("./pages/dev/Haptics"));


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: (failureCount, error) => {
        // Auth/permission errors won't fix themselves by retrying
        const status = (error as { status?: number } | null)?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

applyStoredAppearance();

function OverdueReminderInit() {
  useOverdueReminder();
  return null;
}

/** Layout route for everything behind login: auth check + app shell. */
function ProtectedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  // Session nach Passwort, aber vor dem 2FA-Code (aal1 statt aal2) darf nicht in die App
  const [mfaVerifiedFor, setMfaVerifiedFor] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/landing", { replace: true });
      return;
    }

    if (mfaVerifiedFor !== user.id) {
      let active = true;
      supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data, error }) => {
        if (!active) return;
        if (error) logger.error("ProtectedLayout", "AAL check failed", error);
        if (data && data.nextLevel === "aal2" && data.currentLevel !== "aal2") {
          navigate("/auth", { replace: true });
          return;
        }
        setMfaVerifiedFor(user.id);
      });
      return () => { active = false; };
    }

    if (isNative() && !localStorage.getItem(ONBOARDING_DONE_KEY)) {
      navigate('/native-onboarding', { replace: true });
      return;
    }
  }, [user, loading, navigate, mfaVerifiedFor]);

  if (loading || (user && mfaVerifiedFor !== user.id)) return <PageLoader className="min-h-screen" />;
  if (!user) return null;

  return (
    <AppLayout>
      <RouteErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </RouteErrorBoundary>
    </AppLayout>
  );
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !user.app_metadata?.is_admin)) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) return null;
  if (!user || !user.app_metadata?.is_admin) return null;

  return <>{children}</>;
}

function ConsentGuard({ children }: { children: React.ReactNode }) {
  // Nur fragen, solange noch keine Entscheidung gespeichert ist (auch "Nein" ist eine Entscheidung)
  const [showConsent, setShowConsent] = useState(() => localStorage.getItem(ANALYTICS_CONSENT_KEY) === null);
  const [consentDismissed, setConsentDismissed] = useState(false);

  return (
    <>
      {!consentDismissed && (
        <ConsentScreen 
          isOpen={showConsent} 
          onClose={() => {
            setShowConsent(false);
            setConsentDismissed(true);
          }} 
        />
      )}
      {children}
    </>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader className="min-h-screen" />}>
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
      <Route path="/native-onboarding" element={<NativeOnboarding />} />
      <Route path="/impressum"        element={<PublicPageLayout><Impressum /></PublicPageLayout>}/>
      <Route path="/datenschutz"        element={<PublicPageLayout><Datenschutz /></PublicPageLayout>}/>
      <Route path="/nutzungsbedingungen"        element={<PublicPageLayout><Nutzungsbedingungen /></PublicPageLayout>}/>

      {/* ── App (eingeloggt) ───────────────────────────────────────────── */}
      <Route element={<ProtectedLayout />}>
        <Route path="/"              element={<Dashboard />} />
        <Route path="/inventory"     element={<Inventory />} />
        <Route path="/inventory/:id" element={<ItemDetail />} />
        <Route path="/lending"       element={<Lending />} />
        <Route path="/projects"      element={<ProjectsPage />} />
        <Route path="/projects/:id"  element={<ProjectDetail />} />
        <Route path="/dmx"           element={<DMXPatchplan />} />
        <Route path="/scanner"       element={<Scanner />} />
        <Route path="/help"          element={<HelpPage />} />

        <Route element={<SettingsGuard />}>
          <Route path="/settings"                  element={<AccountSettings />} />
          <Route path="/settings/account-info"     element={<AccountInfo />} />
          <Route path="/settings/notifications"    element={<Notifications />} />
          <Route path="/settings/privacy-security" element={<PrivacySecurity />} />
          <Route path="/settings/appearance"       element={<Appearance />} />
          <Route path="/settings/about"            element={<AboutRigFlow />} />
          <Route path="/settings/wunschliste"      element={<WunschlisteTab />} />
        </Route>

        {/* Dev (nur Admin) */}
        <Route path="/dev/notifications" element={<AdminOnly><NotificationTest /></AdminOnly>} />
        <Route path="/dev/haptics"       element={<AdminOnly><HapticsTest /></AdminOnly>} />
      </Route>

      {/* ── Feature-Seiten (öffentlich) ───────────────────────────────── */}
      <Route path="/features/dmx"     element={<DMX />} />
      <Route path="/features/scanner" element={<ScannerWorkflow />} />
      <Route path="/features/service" element={<Service />} />

      {/* ── Fallback ───────────────────────────────────────────────────── */}
      <Route path="*" element={<NotFound />} />

    </Routes>
    </Suspense>
  );
}

function AppInitializer() {
  useLanguageDetection();

  useEffect(() => {
    if (!isNative()) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Prüfen ob das ein anderer User als beim letzten Mal ist
        const storedUserId = localStorage.getItem('rigflow_last_user_id');
        const currentUserId = session.user.id;

        if (storedUserId !== currentUserId) {
          // Anderer User oder Neuinstallation → Onboarding-Key zurücksetzen
          localStorage.removeItem(ONBOARDING_DONE_KEY);
          localStorage.setItem('rigflow_last_user_id', currentUserId);
        }
      }
    });

    // ── Cold Start: App wurde über Email-Link geöffnet ─────────────────
    const handleAuthUrl = async (url: string) => {
      if (!url.includes('/auth/callback')) return;
      const code = new URL(url).searchParams.get('code');
      if (!code) return;
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) logger.error('AuthUrl', error.message);
      // Navigation übernimmt der onAuthStateChange-Listener oben
    };

    CapApp.getLaunchUrl()
      .then(({ url }) => { if (url) handleAuthUrl(url); })
      .catch(() => {});

    // ── Warm Start: App lief bereits ──────────────────────────────────
    let urlListener: { remove: () => void } | undefined;
    CapApp.addListener('appUrlOpen', ({ url }) => handleAuthUrl(url))
      .then(l => { urlListener = l; });

    return () => {
      subscription.unsubscribe();
      urlListener?.remove();
    };
  }, []);


  // ── Web/PWA: Service Worker + Push ────────────────────────────────────
  useEffect(() => {
    if (isNative()) return;

    const init = async () => {
      // Alten leeren /sw.js deregistrieren
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
            } catch { /* ignore */ }
          }
        }
      }

      // Push Service
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
              case "SW_UPDATE_AVAILABLE": logger.info("App", "SW update available"); break;
              case "SYNC_START": logger.info("App", "Background sync started"); break;
            }
          });
        }
      } catch (error) {
        logger.error("App", "Failed to initialize push service", error);
      }

      // SW Update Handling
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        });

        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) { refreshing = true; window.location.reload(); }
        });

        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'FORCE_RELOAD') {
            setTimeout(() => { window.location.href = window.location.href.split('?')[0]; }, 200);
          }
        });
      }
    };

    init();

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) await registration.update();
        } catch (error) {
          logger.error("App", "Failed to check for SW updates", error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    handleVisibilityChange();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return null;
}

function NativeOnboardingGate() {
  const { user, loading } = useAuth();

  useEffect(() => {
    logger.info('OnboardingGate', `loading=${loading}, user=${user?.email ?? 'null'}, isNative=${isNative()}`);
    
    if (loading || !user) return;

    const hasOnboarded = localStorage.getItem(ONBOARDING_DONE_KEY);
    logger.info('OnboardingGate', `ONBOARDING_DONE_KEY="${hasOnboarded}", pathname="${window.location.pathname}"`);

    if (!hasOnboarded && window.location.pathname !== '/native-onboarding') {
      logger.info('OnboardingGate', 'Navigiere zu /native-onboarding');
      window.location.replace('/native-onboarding');
    }
  }, [user, loading]);

  return null;
}

const App = () => (
  <ErrorBoundary>
    {/* Router ganz außen: auch Consent-Banner & Provider dürfen Links/Navigation nutzen */}
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ConsentGuard>
          <AuthProvider>
            <UndoRedoProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <NativeOnboardingGate />
                <BackButtonHandler />
                <AppInitializer />
                <OverdueReminderInit />
                <CommandPalette />
                <AppRoutes />
                <SpeedInsights />
                <Analytics />
              </TooltipProvider>
            </UndoRedoProvider>
          </AuthProvider>
        </ConsentGuard>
      </QueryClientProvider>
    </BrowserRouter>
  </ErrorBoundary>
);

export default App;
