import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ExternalLink, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import type { InventoryItem } from "@/types/inventory";
import type { Project } from "@/types/project";
import { ItemPositionDetails } from "./ItemPositionDetails";
import type { ScanFeedback } from "./types";

export type ScanResult =
  | { kind: "item"; item: InventoryItem; feedback?: ScanFeedback }
  | { kind: "not_found"; code: string }
  | { kind: "invalid"; code: string };

interface ScanResultSheetProps {
  result: ScanResult;
  /** Continuous mode: scanning goes on in the background, primary action is "Done". */
  continuous?: boolean;
  projects?: Project[];
  onNext: () => void;
  onDone: () => void;
  onDetails?: (itemId: string) => void;
}

const FEEDBACK_STYLE: Record<ScanFeedback["tone"], { Icon: typeof CheckCircle2; className: string }> = {
  success: { Icon: CheckCircle2, className: "text-success" },
  warning: { Icon: AlertTriangle, className: "text-warning" },
  error:   { Icon: XCircle,       className: "text-destructive" },
};

function FeedbackLine({ feedback }: { feedback: ScanFeedback }) {
  const { Icon, className } = FEEDBACK_STYLE[feedback.tone];
  return (
    <p className={cn("flex items-center gap-1.5 text-[13px] font-medium", className)} role="status">
      <Icon className="h-4 w-4 shrink-0" />
      {feedback.message}
    </p>
  );
}

/** Large, glanceable result card shown at the bottom of the scanner. */
export function ScanResultSheet({ result, continuous, projects, onNext, onDone, onDetails }: ScanResultSheetProps) {
  const { t } = useTranslation();
  const [showPosition, setShowPosition] = useState(false);

  const actions = continuous ? (
    <Button size="lg" className="w-full" onClick={onDone}>
      {t("scanner.result.done")}
    </Button>
  ) : (
    <div className="flex gap-2">
      <Button size="lg" variant="outline" className="flex-1" onClick={onDone}>
        {t("scanner.result.done")}
      </Button>
      <Button size="lg" className="flex-1" onClick={onNext}>
        {t("qr_scanner.scan_another")}
      </Button>
    </div>
  );

  if (result.kind !== "item") {
    const notFound = result.kind === "not_found";
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <FeedbackLine
            feedback={{
              tone: "error",
              message: notFound ? t("qr_scanner.item_not_found") : t("scanner.result.invalid_title"),
            }}
          />
          <p className="text-[13px] text-muted-foreground">
            {notFound ? t("scanner.toast.item_not_found_desc") : t("scanner.result.invalid_desc")}
          </p>
          <p className="tech truncate text-xs text-muted-foreground">{result.code}</p>
        </div>
        {actions}
      </div>
    );
  }

  const { item, feedback } = result;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {feedback && <FeedbackLine feedback={feedback} />}
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-lg font-semibold leading-snug tracking-tight">{item.name}</h2>
          <div className="pt-1"><StatusBadge condition={item.condition} /></div>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
          <dt className="text-muted-foreground">{t("qr.item_id")}</dt>
          <dd className="tech truncate">{item.id.slice(0, 8)}</dd>
          <dt className="text-muted-foreground">{t("fields.category")}</dt>
          <dd className="truncate">{t(`categories.${item.category}`, { defaultValue: item.category })}</dd>
          <dt className="text-muted-foreground">{t("fields.location")}</dt>
          <dd className="truncate">{item.location || "—"}</dd>
          {item.quantity > 1 && (
            <>
              <dt className="text-muted-foreground">{t("fields.quantity")}</dt>
              <dd className="tech">{item.quantity}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPosition((v) => !v)}
          aria-expanded={showPosition}
          className="-ml-2.5 text-muted-foreground"
        >
          <ChevronDown className={cn("transition-transform duration-150", showPosition && "rotate-180")} />
          {t("qr_scanner.action_position")}
        </Button>
        {onDetails && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDetails(item.id)}
            className="ml-auto -mr-2.5 text-muted-foreground"
          >
            {t("qr_scanner.action_details")}
            <ExternalLink />
          </Button>
        )}
      </div>

      {showPosition && (
        <div className="max-h-[35dvh] overflow-y-auto">
          <ItemPositionDetails item={item} projects={projects} />
        </div>
      )}

      {actions}
    </div>
  );
}
