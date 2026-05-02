import { useState, useEffect, useRef } from "react";
import { History, ChevronDown, ChevronUp, Package, Trash2, Edit, Layers, RefreshCw, Delete, RotateCcw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { RealtimeChannel } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";

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
  restore: <RotateCcw className="h-3.5 w-3.5 text-green-500" />,
  soft_delete: <Trash2 className="h-3.5 w-3.5 text-destructive" />,
  permanent_delete: <Delete className="h-3.5 w-3.5 text-destructive" />,
};

const ACTION_LABELS: Record<string, string> = {
  create: "Erstellt",
  update: "Aktualisiert",
  delete: "Gelöscht",
  batch_update: "Batch-Update",
  batch_delete: "Batch-Löschen",
  restore: "Wiederhergestellt",
  soft_delete: "In Papierkorb verschoben",
  permanent_delete: "Endgültig gelöscht",
};

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  description: "Beschreibung",
  category: "Kategorie",
  location: "Ort",
  quantity: "Menge",
  unit: "Einheit",
  unit_price: "Stückpreis",
  purchase_date: "Kaufdatum",
  serial_number: "Seriennummer",
  condition: "Zustand",
  status: "Status",
  dmx_start_adress: "DMX Start-Adresse",
  dmx_start_address: "DMX Start-Adresse",
  dmx_address: "DMX Adresse",
  dmx_channels: "DMX Kanäle",
  checked_out_by: "Ausgecheckt von",
  checked_out_at: "Ausgecheckt am",
  last_maintenance: "Letzte Wartung",
  maintenance_notes: "Wartungsnotizen",
  owner: "Besitzer",
  value: "Wert",
  total_value: "Gesamtwert",
  notes: "Notizen",
  created_at: "Erstellt am",
  updated_at: "Aktualisiert am",
  lent_to: "Ausgeliehen an",
  lent_until: "Ausgeliehen bis",
  attributes: "Attribute",
};

function formatFieldName(fieldName: string): string {
  return FIELD_LABELS[fieldName] || fieldName;
}

function formatChanges(changes: AuditLogEntry['changes']): string {
  if (!changes) return "";
  
  const parts = Object.entries(changes).map(([key, val]) => {
    // Special handling for image_url
    if (key === "image_url") {
      if (val.old === null && val.new !== null) {
        return "Bild hinzugefügt";
      } else if (val.old !== null && val.new === null) {
        return "Bild gelöscht";
      } else if (val.old !== null && val.new !== null) {
        return "Bild geändert";
      }
      return "Bild aktualisiert";
    }
    
    const oldVal = val.old ?? "-";
    const newVal = val.new ?? "-";
    const displayName = formatFieldName(key);
    return `${displayName}: ${oldVal} → ${newVal}`;
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
        .limit(80);

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

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t border-border/30 overflow-hidden"
          >
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
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
}
