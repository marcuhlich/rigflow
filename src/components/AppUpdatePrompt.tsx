import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Zap } from 'lucide-react';

interface AppUpdatePromptProps {
  onUpdate: () => void;
  onDismiss: () => void;
}

export function AppUpdatePrompt({ onUpdate, onDismiss }: AppUpdatePromptProps) {
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-slide-up">
      <Card className="glass-card p-4 space-y-3 border-primary/50 bg-primary/5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Neue Version verfügbar</h3>
            <p className="text-xs text-muted-foreground mt-1">
              RigFlow wurde aktualisiert. Laden Sie die neue Version, um die neuesten Features zu nutzen.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDismiss}
            className="flex-1"
          >
            Später
          </Button>
          <Button
            size="sm"
            onClick={onUpdate}
            className="flex-1 gap-1"
          >
            <Zap className="h-3.5 w-3.5" />
            Jetzt laden
          </Button>
        </div>
      </Card>
    </div>
  );
}