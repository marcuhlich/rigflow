import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import i18n from '@/i18n'; // direkt die i18n-Instanz importieren

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    const isChunkError =
      error.name === 'ChunkLoadError' ||
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Importing a module script failed') ||
      error.message.includes('Unable to preload CSS');

    if (isChunkError) {
      window.location.reload();
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught:', error);
    console.error('Error Info:', errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { t } = i18n;

    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
          <div className="bg-destructive/10 border border-destructive rounded-lg p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0" />
              <h2 className="font-bold text-lg text-destructive">
                {t('error_boundary.title')}
              </h2>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {this.state.error?.message || t('error_boundary.fallback_message')}
            </p>

            <div className="bg-destructive/5 rounded p-3 mb-6 text-xs font-mono text-muted-foreground max-h-24 overflow-y-auto">
              {this.state.error?.stack?.slice(0, 200)}...
            </div>

            <div className="space-y-2">
              <button
                onClick={this.handleReload}
                className="w-full px-4 py-2 bg-destructive text-white rounded-md hover:bg-destructive/90 transition font-semibold"
              >
                {t('error_boundary.reload')}
              </button>
              <button
                onClick={this.handleReset}
                className="w-full px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition"
              >
                {t('error_boundary.retry')}
              </button>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              {t('error_boundary.hint')}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}