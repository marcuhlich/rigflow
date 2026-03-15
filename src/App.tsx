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
import { PushService } from "@/lib/pushService";
import { logger } from "@/lib/logger";
import Landing from "./pages/Landing";
import InstallPrompt from "./pages/InstallPrompt";
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

const queryClient = new QueryClient();

function OverdueReminderInit() {
  useOverdueReminder();
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/landing" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      
      {/* Install Prompt (nach Auth) */}
      <Route path="/install-prompt" element={<InstallPrompt />} />
      
      {/* PWA Install Guide */}
      <Route path="/install" element={<Install />} />
      
      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <Inventory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/:id"
        element={
          <ProtectedRoute>
            <ItemDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dmx"
        element={
          <ProtectedRoute>
            <DMXPatchplan />
          </ProtectedRoute>
        }
      />
      <Route
        path="/checklists"
        element={
          <ProtectedRoute>
            <ChecklistsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sets"
        element={
          <ProtectedRoute>
            <EventSetsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lending"
        element={
          <ProtectedRoute>
            <Lending />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AccountSettings />
          </ProtectedRoute>
        }
      />

      <Route path="/help" element={
        <ProtectedRoute>
          <HelpPage />
        </ProtectedRoute>
      } />
      
      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function AppInitializer() {
  useEffect(() => {
    // Initialize push notifications and service worker
    const initializePush = async () => {
      try {
        const initialized = await PushService.initialize({
          enableNotifications: true,
          enableBackground: true,
        });

        if (initialized) {
          logger.info("App", "Push service initialized");

          // Listen for messages from service worker
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
    };

    initializePush();

    // FORCE NEW SW ACTIVATION (direkt hier, nicht in neuem useEffect!)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration && registration.waiting) {
          console.log('🔥 New SW waiting, forcing activation NOW');
          
          // Sende SKIP_WAITING an neuen SW
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          
          // Wenn Controller wechselt → Seite neu laden
          let refreshing = false;
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
              refreshing = true;
              console.log('🔥 Controller changed, reloading');
              window.location.reload();
            }
          });
        }
      });

      // FORCE RELOAD Listener
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('📨 Message from SW:', event.data);
        
        if (event.data?.type === 'FORCE_RELOAD') {
          console.log('🔥 SW KILL: Force reloading page NOW');
          
          setTimeout(() => {
            window.location.href = window.location.href.split('?')[0];
          }, 200);
        }
      });

      // Zusätzlich: ready check
      navigator.serviceWorker.ready.then(registration => {
        if (registration.waiting) {
          console.log('🔥 New SW waiting (ready check), sending SKIP_WAITING');
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    }

    // Check for updates when app comes into focus (wichtig für Mobile!)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        logger.info('App', 'App became visible, checking for SW updates...');
        
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
              logger.info('App', 'Triggering SW update check');
              await registration.update();
            }
          } catch (error) {
            logger.error('App', 'Failed to check for SW updates', error);
          }
        }
      }
    };

    // Event listener hinzufügen
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Auch direkt beim Start einmal prüfen
    handleVisibilityChange();

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </UndoRedoProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;