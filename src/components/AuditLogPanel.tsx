import { useState, useEffect, useRef } from "react";
import { History, ChevronDown, ChevronUp, Package, Trash2, Edit, Layers, RefreshCw, Delete, RotateCcw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { RealtimeChannel } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

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

function formatChanges(
  changes: AuditLogEntry['changes'],
  t: ReturnType<typeof useTranslation>['t']
): string {
  if (!changes) return "";

  const parts = Object.entries(changes).map(([key, val]) => {
    if (key === "image_url") {
      if (val.old === null && val.new !== null) return t('audit.image_added');
      if (val.old !== null && val.new === null) return t('audit.image_deleted');
      if (val.old !== null && val.new !== null) return t('audit.image_changed');
      return t('audit.image_updated');
    }

    const SENSITIVE_FIELDS = new Set(['password', 'password_hash', 'token', 'secret']);
    const oldVal = SENSITIVE_FIELDS.has(key) ? '***' : (val.old ?? "-");
    const newVal = SENSITIVE_FIELDS.has(key) ? '***' : (val.new ?? "-");
    const displayName = t(`fields.${key}`, { defaultValue: key });
    return `${displayName}: ${oldVal} → ${newVal}`;
  });

  return parts.join(", ");
}

export function AuditLogPanel() {
  const { t, i18n } = useTranslation();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const LOG_LIMIT = 50;

  const dateLocale = i18n.language.startsWith('de') ? de : enUS;

  const fetchLogs = async () => {
    if (!user) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('id, action, item_id, item_name, changes, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(LOG_LIMIT);

      if (error) throw error;
      setLogs(data as AuditLogEntry[]);
    } catch {
      setFetchError(t('audit.fetch_error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    if (user) {
      channelRef.current = supabase
        .channel(`audit-log-changes-${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_log' },
          (payload) => {
            const newLog = payload.new as AuditLogEntry;
            if (newLog.user_id === user.id) {
              setLogs(prev => [newLog, ...prev].slice(0, LOG_LIMIT));
            }
          }
        )
        .subscribe();
    }

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
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
          <span className="font-medium text-sm">{t('audit.panel_title')}</span>
          <span className="text-xs text-muted-foreground">
            ({t('audit.entry_count', { count: logs.length })})
          </span>
        </div>
        {isExpanded
          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
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
                {t('audit.loading')}
              </div>
            ) : fetchError ? (
              <div className="p-4 text-center text-sm text-destructive">
                {fetchError}
              </div>
            ) : logs.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {t('audit.empty')}
              </div>
            ) : (
              <ScrollArea className="h-64">
                <div className="divide-y divide-border/30">
                  {logs.map((log) => (
                    <div key={log.id} className="p-3 hover:bg-muted/10 transition-colors">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5">
                          {ACTION_ICONS[log.action] || <Edit className="h-3.5 w-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium">
                              {t(`audit.actions.${log.action}`, { defaultValue: log.action })}
                            </span>
                            {log.item_name && (
                              <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {log.item_name}
                              </span>
                            )}
                          </div>
                          {log.changes && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {formatChanges(log.changes, t)}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {format(new Date(log.created_at), "dd.MM.yyyy HH:mm", { locale: dateLocale })}
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