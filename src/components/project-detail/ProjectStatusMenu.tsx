import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STATUS_ORDER } from "@/hooks/useProjects";
import type { ProjectStatus } from "@/types/project";
import { cn } from "@/lib/utils";
import { STATUS_DOT } from "./constants";

function StatusDot({ status }: { status: ProjectStatus }) {
  return <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT[status])} />;
}

export function ProjectStatusLabel({ status }: { status: ProjectStatus }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-[13px] font-medium">
      <StatusDot status={status} />
      {t(`project_status.${status}`, { defaultValue: status })}
    </span>
  );
}

interface Props {
  status: ProjectStatus;
  onChange: (status: ProjectStatus) => void;
  disabled?: boolean;
}

/** Status pill that opens a menu with all phases. */
export function ProjectStatusMenu({ status, onChange, disabled }: Props) {
  const { t } = useTranslation();
  if (disabled) return <ProjectStatusLabel status={status} />;

  const nextIdx = STATUS_ORDER.indexOf(status) + 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-[13px] font-medium transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("project_detail.status_menu_label")}
        >
          <StatusDot status={status} />
          {t(`project_status.${status}`, { defaultValue: status })}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[200px]">
        {STATUS_ORDER.map((s, idx) => (
          <DropdownMenuItem key={s} disabled={s === status} onSelect={() => onChange(s)} className="gap-2">
            <StatusDot status={s} />
            <span>{t(`project_status.${s}`, { defaultValue: s })}</span>
            {idx === nextIdx && (
              <span className="ml-auto text-[11px] text-muted-foreground">{t("project_detail.status_next")}</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
