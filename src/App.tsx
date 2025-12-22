import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HelpPage from "@/pages/HelpPage";
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from "react-router-dom";
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
import DMXPatchplan from "./pages/DMXPatchplan";
import { ChecklistsPage } from "./pages/Checklists";
import AccountSettings from "./pages/AccountSettings";
import Auth from "./pages/Auth";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// ------------------- Protected Route -------------------
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

// ------------------- Landing Route Wrapper -------------------
function LandingRoute() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const visited = localStorage.getItem("visitedLanding");

    if (visited) {
      // Bereits besucht → direkt Auth oder Dashboard
      navigate(user ? "/" : "/auth", { replace: true });
    } else {
      // Erster Besuch → Landing zeigen
      localStorage.setItem("visitedLanding", "true");
    }
  }, [navigate, user]);

  return <Landing />;
}

// ------------------- App Routes -------------------
function AppRoutes() {
  return (
    <Routes>
      {/* Landing Page nur beim ersten Besuch */}
      <Route path="/" element={<LandingRoute />} />

      {/* Public Routes */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/install-prompt" element={<InstallPrompt />} />
      <Route path="/install" element={<Install />} />
      <Route path="/help" element={<HelpPage />} />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
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

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// ------------------- App Initializer -------------------
function AppInitializer() {
  useEffect(() => {
    const initializePush = async () => {
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
    };

    initializePush();

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        logger.info("App", "App became visible, checking for SW updates...");
        if ("serviceWorker" in navigator) {
          try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
              logger.info("App", "Triggering SW update check");
              await registration.update();
            }
          } catch (error) {
            logger.error("App", "Failed to check for SW updates", error);
          }
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

// ------------------- Main App -------------------
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
