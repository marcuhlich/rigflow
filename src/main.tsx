import posthog from "posthog-js";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_POSTHOG_HOST,
  autocapture: false,
  disable_session_recording: true,
});
posthog.capture("test_event");
(window as any).posthog = posthog;

createRoot(document.getElementById("root")!).render(<App />);