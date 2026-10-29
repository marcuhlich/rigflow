import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LendingRecord } from "@/hooks/useLendingHistory";
import { formatDay, parseDay } from "@/components/projects/format";
import { cn } from "@/lib/utils";
import { DueState, getDueState } from "./loanStatus";

interface Props {
  records: LendingRecord[];
  mode: "active" | "history";
  returningIds: ReadonlySet<string>;
  onReturn: (record: LendingRecord) => void;
  onDelete: (record: LendingRecord) => void;
}

export function LoanList(props: Props) {
  return (
    <>
      <LoanTable {...props} />
      <LoanRows {...props} />
    </>
  );
}

function useDay() {
  const { i18n } = useTranslation();
  return (value: string | null | undefined) => {
    const d = parseDay(value);
    return d ? formatDay(d, i18n.language) : null;
  };
}

function DueLabel({ state }: { state: DueState }) {
  const { t } = useTranslation();
  switch (state.kind) {
    case "overdue":
      return (
        <span className="inline-flex items-center gap-1 font-medium text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {t("lending.overdue_badge", { count: state.days })}
        </span>
      );
    case "today":
      return <span className="font-medium text-warning">{t("lending.due_today")}</span>;
    case "soon":
      return <span className="text-warning">{t("lending.due_soon", { count: state.days })}</span>;
    case "ok":
      return <span className="text-muted-foreground">{t("lending.due_soon", { count: state.days })}</span>;
    case "returned":
      return (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
          {t("lending.card.returned_badge")}
        </span>
      );
    default:
      return <span className="text-muted-foreground/60">–</span>;
  }
}

function Day({ value }: { value: string | null }) {
  return value ? <span className="tech">{value}</span> : <span className="text-muted-foreground/60">–</span>;
}

function RowActions({ record, mode, returning, onReturn, onDelete }: {
  record: LendingRecord;
  mode: Props["mode"];
  returning: boolean;
  onReturn: Props["onReturn"];
  onDelete: Props["onDelete"];
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-end gap-1">
      {mode === "active" && (
        <Button size="sm" variant="outline" disabled={returning} onClick={() => onReturn(record)}>
          <RotateCcw />
          {t("lending.card.return_button")}
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("common.actions")}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onDelete(record)} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            {t("common.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── Desktop table ────────────────────────────────────────────────────────────

function LoanTable({ records, mode, returningIds, onReturn, onDelete }: Props) {
  const { t } = useTranslation();
  const day = useDay();

  return (
    <div className="surface hidden overflow-hidden md:block">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-surface-sunken text-left">
          <tr className="text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">{t("lending.table.item")}</th>
            <th className="px-3 py-2 font-medium">{t("lending.table.borrower")}</th>
            <th className="px-3 py-2 font-medium">{t("lending.table.lent_at")}</th>
            <th className="px-3 py-2 font-medium">{t("lending.table.due_date")}</th>
            <th className="px-3 py-2 font-medium">
              {mode === "active" ? t("lending.table.status") : t("lending.table.returned_at")}
            </th>
            <th className="px-3 py-2"><span className="sr-only">{t("common.actions")}</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {records.map(r => (
            <tr key={r.id} className="align-top transition-colors hover:bg-muted/40">
              <td className="max-w-0 px-3 py-2.5">
                <p className="truncate font-medium">{r.item_name}</p>
                {r.notes && <p className="truncate text-xs text-muted-foreground">{r.notes}</p>}
              </td>
              <td className="max-w-[14rem] truncate px-3 py-2.5">{r.lent_to}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground"><Day value={day(r.lent_at)} /></td>
              <td className="whitespace-nowrap px-3 py-2.5"><Day value={day(r.due_date)} /></td>
              <td className="whitespace-nowrap px-3 py-2.5">
                {mode === "active" ? <DueLabel state={getDueState(r)} /> : <Day value={day(r.returned_at)} />}
              </td>
              <td className="w-px whitespace-nowrap px-2 py-1.5">
                <RowActions
                  record={r}
                  mode={mode}
                  returning={returningIds.has(r.id)}
                  onReturn={onReturn}
                  onDelete={onDelete}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Mobile rows ──────────────────────────────────────────────────────────────

function LoanRows({ records, mode, returningIds, onReturn, onDelete }: Props) {
  const { t } = useTranslation();
  const day = useDay();

  return (
    <ul className="surface divide-y divide-border overflow-hidden md:hidden">
      {records.map(r => {
        const state = getDueState(r);
        const due = day(r.due_date);
        const returned = day(r.returned_at);
        return (
          <li key={r.id} className="space-y-2 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.item_name}</p>
                <p className="truncate text-[13px] text-muted-foreground">
                  {t("lending.card.lent_to_label")} <span className="text-foreground">{r.lent_to}</span>
                </p>
              </div>
              <div className="shrink-0 pt-0.5 text-xs">
                <DueLabel state={state} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dl className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <div className="flex gap-1">
                  <dt>{t("lending.card.lent_at")}</dt>
                  <dd><Day value={day(r.lent_at)} /></dd>
                </div>
                {due && (
                  <div className={cn("flex gap-1", state.kind === "overdue" && "text-destructive")}>
                    <dt>{t("lending.card.due_date")}</dt>
                    <dd><Day value={due} /></dd>
                  </div>
                )}
                {returned && (
                  <div className="flex gap-1">
                    <dt>{t("lending.card.returned_at")}</dt>
                    <dd><Day value={returned} /></dd>
                  </div>
                )}
              </dl>
              <RowActions
                record={r}
                mode={mode}
                returning={returningIds.has(r.id)}
                onReturn={onReturn}
                onDelete={onDelete}
              />
            </div>
            {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
          </li>
        );
      })}
    </ul>
  );
}
