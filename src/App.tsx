import { useEffect } from "react";
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
import AccountSettings from "./pages/AccountSettings";
import Auth from "./pages/Auth";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

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

    // FORCE RELOAD Listener (verstärkt)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('📨 Message from SW:', event.data);
        
        if (event.data?.type === 'FORCE_RELOAD') {
          console.log('🔥 SW KILL: Force reloading page NOW');
          
          // Kurz warten, damit SW alles clearen kann
          setTimeout(() => {
            window.location.href = window.location.href.split('?')[0];
          }, 200);
        }
      });

      // Zusätzlich: Wenn ein neuer SW wartet, sofort aktivieren
      navigator.serviceWorker.ready.then(registration => {
        if (registration.waiting) {
          console.log('🔥 New SW waiting, sending SKIP_WAITING');
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          
          // Warte auf Controller-Wechsel
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('🔥 SW Controller changed, reloading');
            window.location.reload();
          });
        }
      });
    }
  }, []);

  return null;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppInitializer />
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;