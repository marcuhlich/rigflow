import { useState } from "react";
import { History, ChevronDown, ChevronUp, Package, Trash2, Edit, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuditLog, AuditLogEntry } from "@/hooks/useAuditLog";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const ACTION_ICONS: Record<string, React.ReactNode> = {
  create: <Package className="h-3.5 w-3.5 text-green-500" />,
  update: <Edit className="h-3.5 w-3.5 text-blue-500" />,
  delete: <Trash2 className="h-3.5 w-3.5 text-destructive" />,
  batch_update: <Layers className="h-3.5 w-3.5 text-blue-500" />,
  batch_delete: <Layers className="h-3.5 w-3.5 text-destructive" />,
};

const ACTION_LABELS: Record<string, string> = {
  create: "Erstellt",
  update: "Aktualisiert",
  delete: "Gelöscht",
  batch_update: "Batch-Update",
  batch_delete: "Batch-Löschen",
};

function formatChanges(changes: AuditLogEntry['changes']): string {
  if (!changes) return "";
  
  const parts = Object.entries(changes).map(([key, val]) => {
    const oldVal = val.old ?? "-";
    const newVal = val.new ?? "-";
    return `${key}: ${oldVal} → ${newVal}`;
  });
  
  return parts.join(", ");
}

export function AuditLogPanel() {
  const { logs, loading } = useAuditLog();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Änderungsverlauf</span>
          <span className="text-xs text-muted-foreground">
            ({logs.length} Einträge)
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-border/30">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Lade Verlauf...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Noch keine Änderungen protokolliert.
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="divide-y divide-border/30">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 hover:bg-muted/10 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">
                        {ACTION_ICONS[log.action] || <Edit className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium">
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                          {log.item_name && (
                            <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {log.item_name}
                            </span>
                          )}
                        </div>
                        {log.changes && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {formatChanges(log.changes)}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {format(new Date(log.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}
