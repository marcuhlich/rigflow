import { useState, useEffect, useRef } from "react";
import { History, ChevronDown, ChevronUp, Package, Trash2, Edit, Layers, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { RealtimeChannel } from "@supabase/supabase-js";

interface AuditLogEntry {
  id: string;
  user_id: string;
  item_id: string | null;
  action: string;
  item_name: string | null;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  created_at: string;
}

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
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchLogs = async () => {
    if (!user) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data as AuditLogEntry[]);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Subscribe to realtime updates
    if (user) {
      channelRef.current = supabase
        .channel('audit-log-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'audit_log',
          },
          (payload) => {
            const newLog = payload.new as AuditLogEntry;
            if (newLog.user_id === user.id) {
              setLogs(prev => [newLog, ...prev].slice(0, 50));
            }
          }
        )
        .subscribe();
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user]);

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Letzte Änderungen</span>
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
              <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />
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
