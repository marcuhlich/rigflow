import { useTranslation } from "react-i18next";
import { ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { STATUSES, STATUS_DOT, type FeatureRequest, type RequestStatus } from "./useFeatureRequests";

interface Props {
  request: FeatureRequest;
  isAdmin: boolean;
  votePending: boolean;
  onVote: () => void;
  onStatusChange: (status: RequestStatus) => void;
  onDelete: () => void;
}

export function FeatureRequestRow({ request, isAdmin, votePending, onVote, onStatusChange, onDelete }: Props) {
  const { t } = useTranslation();

  return (
    <li className="flex items-start gap-3 px-3 py-3 sm:px-4">
      <button
        type="button"
        onClick={onVote}
        disabled={votePending}
        aria-pressed={request.hasVoted}
        aria-label={request.hasVoted ? t("wishlist.unvote") : t("wishlist.vote")}
        className={cn(
          "flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70",
          request.hasVoted
            ? "border-primary/50 bg-primary/10 text-primary"
            : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
        )}
      >
        <ChevronUp className="h-4 w-4" />
        <span className="font-mono text-xs font-semibold tabular-nums leading-none">{request.votes}</span>
      </button>

      <div className="min-w-0 flex-1 pt-0.5">
        <p className="break-words text-sm font-medium leading-snug">{request.title}</p>
        {request.description && (
          <p className="mt-0.5 line-clamp-3 break-words text-[13px] leading-relaxed text-muted-foreground">
            {request.description}
          </p>
        )}

        {isAdmin && (
          <div className="mt-2 flex items-center gap-1.5">
            <Select value={request.status} onValueChange={(v) => onStatusChange(v as RequestStatus)}>
              <SelectTrigger className="h-7 w-auto gap-1.5 px-2 text-xs" aria-label={t("wishlist.status_label")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-[13px]">
                    <span className="inline-flex items-center gap-2">
                      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[s])} />
                      {t(`wishlist.status.${s}`)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              aria-label={t("common.delete")}
            >
              <Trash2 className="!size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}
