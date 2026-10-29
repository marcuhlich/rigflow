import { ReactNode, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/QueryState";
import { DashboardPanel } from "@/components/dashboard/DashboardPanel";
import type { MaintenanceDue } from "@/components/dashboard/useMaintenanceDue";
import type { LendingRecord } from "@/hooks/useLendingHistory";
import type { InventoryItem } from "@/types/inventory";
import { cn } from "@/lib/utils";

/** Loans due within this many days are listed (overdue always). */
const LOAN_LOOKAHEAD_DAYS = 3;
const GROUP_LIMIT = 5;

type Tone = "warning" | "destructive";

const TONE_DOT: Record<Tone, string> = { warning: "bg-warning", destructive: "bg-destructive" };
const TONE_TEXT: Record<Tone, string> = { warning: "text-warning", destructive: "text-destructive" };

function dueLabel(daysLeft: number, t: TFunction): { label: string; tone: Tone } {
  if (daysLeft < 0) return { label: t("lending.overdue_badge", { count: -daysLeft }), tone: "destructive" };
  if (daysLeft === 0) return { label: t("lending.due_today"), tone: "warning" };
  return { label: t("lending.due_soon", { count: daysLeft }), tone: "warning" };
}

interface RowProps {
  to: string;
  title: string;
  meta?: ReactNode;
  tag?: string;
  tone: Tone;
  action?: ReactNode;
}

function AttentionRow({ to, title, meta, tag, tone, action }: RowProps) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TONE_DOT[tone])} aria-hidden />
      <Link to={to} className="group min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium underline-offset-2 group-hover:underline">{title}</p>
        {meta && <p className="truncate text-[12px] text-muted-foreground">{meta}</p>}
      </Link>
      {tag && <span className={cn("shrink-0 text-[12px] font-medium tabular-nums", TONE_TEXT[tone])}>{tag}</span>}
      {action}
    </li>
  );
}

function Group({
  label,
  total,
  moreTo,
  children,
}: {
  label: string;
  total: number;
  moreTo: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex items-center justify-between bg-surface-sunken px-4 py-1.5">
        <span className="eyebrow">{label}</span>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{total}</span>
      </div>
      <ul className="divide-y divide-border">{children}</ul>
      {total > GROUP_LIMIT && (
        <Link
          to={moreTo}
          className="block border-t border-border px-4 py-2 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("dashboard.attention.more", { count: total - GROUP_LIMIT })}
        </Link>
      )}
    </div>
  );
}

interface AttentionPanelProps {
  activeLoans: LendingRecord[];
  defectItems: InventoryItem[];
  maintenance: {
    due: MaintenanceDue[];
    isLoading: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  onReturn: (loanId: string) => Promise<void>;
}

/** Overdue / due-soon returns, defective items and due maintenance in one list. */
export function AttentionPanel({ activeLoans, defectItems, maintenance, onReturn }: AttentionPanelProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("de") ? de : enUS;
  const [returningId, setReturningId] = useState<string | null>(null);

  const dueLoans = useMemo(() => {
    const today = startOfDay(new Date());
    return activeLoans
      .filter((l): l is LendingRecord & { due_date: string } => !!l.due_date)
      .map((loan) => ({ loan, daysLeft: differenceInCalendarDays(parseISO(loan.due_date), today) }))
      .filter((l) => l.daysLeft <= LOAN_LOOKAHEAD_DAYS)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [activeLoans]);

  const handleReturn = async (loanId: string) => {
    setReturningId(loanId);
    try {
      await onReturn(loanId);
    } finally {
      setReturningId(null);
    }
  };

  const total = dueLoans.length + defectItems.length + maintenance.due.length;
  const fmtDate = (d: Date) => format(d, "dd. MMM", { locale });

  const nothingToShow = total === 0 && !maintenance.isLoading && !maintenance.error;

  return (
    <DashboardPanel title={t("dashboard.attention.title")} count={total}>
      {nothingToShow ? (
        <div className="flex items-center gap-3 px-4 py-6">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
          <div>
            <p className="text-[13px] font-medium">{t("dashboard.attention.empty_title")}</p>
            <p className="text-[12px] text-muted-foreground">{t("dashboard.attention.empty_desc")}</p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {dueLoans.length > 0 && (
            <Group label={t("dashboard.attention.group_returns")} total={dueLoans.length} moreTo="/lending">
              {dueLoans.slice(0, GROUP_LIMIT).map(({ loan, daysLeft }) => {
                const { label, tone } = dueLabel(daysLeft, t);
                const busy = returningId === loan.id;
                return (
                  <AttentionRow
                    key={loan.id}
                    to={`/inventory/${loan.item_id}`}
                    title={loan.item_name}
                    meta={`${t("dashboard.lent_to", { name: loan.lent_to || "–" })} · ${t("dashboard.due_until", {
                      date: fmtDate(parseISO(loan.due_date)),
                    })}`}
                    tag={label}
                    tone={tone}
                    action={
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 shrink-0 px-2 text-[12px]"
                        disabled={returningId !== null}
                        onClick={() => void handleReturn(loan.id)}
                      >
                        {busy && <Loader2 className="animate-spin" />}
                        {t("lending.card.return_button")}
                      </Button>
                    }
                  />
                );
              })}
            </Group>
          )}

          {defectItems.length > 0 && (
            <Group label={t("dashboard.stat.defect")} total={defectItems.length} moreTo="/inventory?filter=defekt">
              {defectItems.slice(0, GROUP_LIMIT).map((item) => (
                <AttentionRow
                  key={item.id}
                  to={`/inventory/${item.id}`}
                  title={item.name}
                  meta={[t(`categories.${item.category}`, { defaultValue: item.category }), item.location]
                    .filter(Boolean)
                    .join(" · ")}
                  tag={item.quantity > 1 ? `${item.quantity}×` : undefined}
                  tone="destructive"
                />
              ))}
            </Group>
          )}

          {maintenance.isLoading ? (
            <div className="space-y-2 px-4 py-3">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          ) : maintenance.error ? (
            <ErrorState
              error={maintenance.error}
              onRetry={() => void maintenance.refetch()}
              className="rounded-none border-0 py-6"
            />
          ) : (
            maintenance.due.length > 0 && (
              <Group label={t("dashboard.attention.group_maintenance")} total={maintenance.due.length} moreTo="/inventory">
                {maintenance.due.slice(0, GROUP_LIMIT).map(({ item, dueDate, daysLeft }) => {
                  const { label, tone } =
                    daysLeft === null
                      ? { label: t("dashboard.attention.never_maintained"), tone: "destructive" as Tone }
                      : dueLabel(daysLeft, t);
                  return (
                    <AttentionRow
                      key={item.id}
                      to={`/inventory/${item.id}`}
                      title={item.name}
                      meta={
                        dueDate
                          ? t("dashboard.attention.maintenance_due_on", { date: fmtDate(dueDate) })
                          : t("maintenance.status.never")
                      }
                      tag={label}
                      tone={tone}
                    />
                  );
                })}
              </Group>
            )
          )}
        </div>
      )}
    </DashboardPanel>
  );
}
