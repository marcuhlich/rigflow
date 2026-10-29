import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import {
  ChevronDown, Delete, Edit, History, Layers, Loader2, Package, RotateCcw, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ErrorState } from "@/components/QueryState";
import { cn } from "@/lib/utils";

interface AuditLogEntry {
  id: string;
  user_id?: string;
  item_id: string | null;
  action: string;
  item_name: string | null;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  created_at: string;
}

const LOG_LIMIT = 50;

const ACTION_ICONS: Record<string, React.ElementType> = {
  create: Package,
  update: Edit,
  delete: Trash2,
  batch_update: Layers,
  batch_delete: Layers,
  restore: RotateCcw,
  soft_delete: Trash2,
  permanent_delete: Delete,
};

const DESTRUCTIVE_ACTIONS = new Set(["delete", "batch_delete", "soft_delete", "permanent_delete"]);
const SENSITIVE_FIELDS = new Set(["password", "password_hash", "token", "secret"]);

function displayValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "–";
  if (typeof v === "object") {
    try { return JSON.stringify(v); } catch { return "…"; }
  }
  return String(v);
}

function formatChanges(changes: AuditLogEntry["changes"], t: TFunction): string {
  if (!changes || typeof changes !== "object") return "";

  return Object.entries(changes)
    .map(([key, val]) => {
      const oldV = val?.old ?? null;
      const newV = val?.new ?? null;
      if (key === "image_url") {
        if (oldV === null && newV !== null) return t("audit.image_added");
        if (oldV !== null && newV === null) return t("audit.image_deleted");
        if (oldV !== null && newV !== null) return t("audit.image_changed");
        return t("audit.image_updated");
      }
      const sensitive = SENSITIVE_FIELDS.has(key);
      const label = t(`fields.${key}`, { defaultValue: key });
      return `${label}: ${sensitive ? "***" : displayValue(oldV)} → ${sensitive ? "***" : displayValue(newV)}`;
    })
    .join(", ");
}

/** Collapsible feed of the latest inventory changes (with realtime inserts). */
export function AuditLogPanel() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const dateLocale = i18n.language.startsWith("de") ? de : enUS;
  const userId = user?.id;

  useEffect(() => {
    if (!userId) {
      setLogs([]);
      setLoading(false);
      return;
    }
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setFetchError(null);
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, action, item_id, item_name, changes, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(LOG_LIMIT);
      if (cancelled) return;
      if (error) setFetchError(error.message);
      else setLogs((data ?? []) as AuditLogEntry[]);
      setLoading(false);
    };
    void load();

    const channel = supabase
      .channel(`audit-log-changes-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_log", filter: `user_id=eq.${userId}` },
        payload => {
          const entry = payload.new as AuditLogEntry;
          if (entry.user_id && entry.user_id !== userId) return;
          setLogs(prev => (prev.some(l => l.id === entry.id) ? prev : [entry, ...prev].slice(0, LOG_LIMIT)));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [userId, reloadKey]);

  const retry = useCallback(() => setReloadKey(k => k + 1), []);

  return (
    <div className="surface overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(v => !v)}
        aria-expanded={isExpanded}
        className="flex h-11 w-full items-center gap-2 px-3 text-left transition-colors hover:bg-muted/60 sm:px-4"
      >
        <History className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium">{t("audit.panel_title")}</span>
        {!loading && !fetchError && (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">{logs.length}</span>
        )}
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150",
            isExpanded && "rotate-180",
          )}
        />
      </button>

      {isExpanded && (
        <div className="border-t border-border">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-[13px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("audit.loading")}
            </div>
          ) : fetchError ? (
            <ErrorState
              title={t("audit.fetch_error")}
              error={fetchError}
              onRetry={retry}
              className="rounded-none border-0"
            />
          ) : logs.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">{t("audit.empty")}</p>
          ) : (
            <ul className="max-h-72 divide-y divide-border overflow-y-auto overscroll-contain">
              {logs.map(log => {
                const Icon = ACTION_ICONS[log.action] ?? Edit;
                const changes = formatChanges(log.changes, t);
                return (
                  <li key={log.id} className="flex items-start gap-2.5 px-3 py-2.5 sm:px-4">
                    <Icon
                      className={cn(
                        "mt-0.5 h-3.5 w-3.5 shrink-0",
                        DESTRUCTIVE_ACTIONS.has(log.action) ? "text-destructive" : "text-muted-foreground",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="shrink-0 text-[13px] font-medium">
                          {t(`audit.actions.${log.action}`, { defaultValue: log.action })}
                        </span>
                        {log.item_name && (
                          <span className="min-w-0 truncate text-[13px] text-muted-foreground">{log.item_name}</span>
                        )}
                        <time
                          dateTime={log.created_at}
                          className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground"
                        >
                          {format(new Date(log.created_at), "dd.MM.yy HH:mm", { locale: dateLocale })}
                        </time>
                      </div>
                      {changes && (
                        <p className="mt-0.5 line-clamp-2 break-words text-xs text-muted-foreground">{changes}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
