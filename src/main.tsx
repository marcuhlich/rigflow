import posthog from "posthog-js";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Chunk-Ladefehler abfangen (z.B. nach Deployments)
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_POSTHOG_HOST,
  autocapture: false,
  opt_out_capturing_by_default: true,
});
(window as any).posthog = posthog;

createRoot(document.getElementById("root")!).render(<App />);