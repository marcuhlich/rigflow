import './i18n';
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializePostHog } from "./lib/consentUtils";
import { logger } from "./lib/logger";

// Chunk-Ladefehler abfangen (z.B. nach Deployments) – aber nicht in eine Reload-Schleife geraten,
// falls der Chunk auch nach dem Reload fehlt (z.B. offline).
const PRELOAD_RELOAD_KEY = 'rigflow_preload_reload_at';
window.addEventListener('vite:preloadError', (event) => {
  let last = 0;
  try { last = Number(sessionStorage.getItem(PRELOAD_RELOAD_KEY) || 0); } catch { /* storage unavailable */ }
  if (Date.now() - last < 10_000) {
    logger.error('main', 'Chunk failed to load again after reload – not reloading', (event as Event & { payload?: unknown }).payload);
    return;
  }
  event.preventDefault();
  try { sessionStorage.setItem(PRELOAD_RELOAD_KEY, String(Date.now())); } catch { /* storage unavailable */ }
  window.location.reload();
});

// Initialize PostHog (consent is managed in App.tsx via ConsentGuard).
// Analytics must never prevent the app from rendering.
try {
  initializePostHog();
} catch (error) {
  logger.error('main', 'PostHog initialization failed', error);
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root not found");
createRoot(rootElement).render(<App />);