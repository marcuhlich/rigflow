import { Component, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import i18n from "@/i18n";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  /** Render inline (inside the app shell) instead of full screen */
  inline?: boolean;
  /** When this value changes, the boundary resets (e.g. the current path) */
  resetKey?: string;
}

interface State {
  error: Error | null;
}

const CHUNK_RELOAD_KEY = "rigflow:chunk-reload-at";

function isChunkLoadError(error: Error) {
  return (
    error.name === "ChunkLoadError" ||
    error.message.includes("Failed to fetch dynamically imported module") ||
    error.message.includes("Importing a module script failed") ||
    error.message.includes("Unable to preload CSS")
  );
}

/**
 * After a deploy, old lazy chunks 404. Reload once to get the new build,
 * but never loop (e.g. when the user is offline).
 */
function tryReloadForChunkError(): boolean {
  const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? 0);
  if (Date.now() - last < 10_000) return false;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  window.location.reload();
  return true;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (isChunkLoadError(error) && tryReloadForChunkError()) return;
    logger.error("ErrorBoundary", error.message, { stack: error.stack, componentStack: errorInfo.componentStack });
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  handleReset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const { t } = i18n;
    const { inline } = this.props;

    return (
      <div className={cn("flex items-center justify-center p-4", inline ? "min-h-[50vh]" : "min-h-screen bg-background")}>
        <div className="surface w-full max-w-md p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold">{t("error_boundary.title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground break-words">
                {error.message || t("error_boundary.fallback_message")}
              </p>
            </div>
          </div>

          {import.meta.env.DEV && error.stack && (
            <pre className="mt-4 max-h-32 overflow-auto rounded-md bg-surface-sunken p-3 font-mono text-2xs text-muted-foreground user-select-text">
              {error.stack}
            </pre>
          )}

          <div className="mt-5 flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="h-9 flex-1 rounded-md bg-foreground px-3 text-sm font-medium text-background hover:bg-foreground/90"
            >
              {t("error_boundary.reload")}
            </button>
            <button
              onClick={this.handleReset}
              className="h-9 flex-1 rounded-md border border-input px-3 text-sm font-medium hover:bg-muted"
            >
              {t("error_boundary.retry")}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

/** Per-page boundary: a crash in one page keeps the navigation usable and resets on navigation. */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary inline resetKey={pathname}>
      {children}
    </ErrorBoundary>
  );
}
