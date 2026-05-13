import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializePostHog } from "./lib/consentUtils";

// Chunk-Ladefehler abfangen (z.B. nach Deployments)
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

// Initialize PostHog (consent is managed in App.tsx via ConsentGuard)
initializePostHog();

createRoot(document.getElementById("root")!).render(<App />);