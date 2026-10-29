import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { DateRange } from "react-day-picker";
import { CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { dateFnsLocale, formatDayRange } from "./format";

interface Props {
  id?: string;
  start: Date | undefined;
  end: Date | undefined;
  onChange: (start: Date | undefined, end: Date | undefined) => void;
}

/** Period picker for project dates. Closes once a full range has been picked. */
export function DateRangeField({ id, start, end, onChange }: Props) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const label = formatDayRange(start, end, i18n.language);

  const handleSelect = (range: DateRange | undefined) => {
    const hadStartOnly = !!start && !end;
    onChange(range?.from, range?.to);
    if (hadStartOnly && range?.from && range?.to) setOpen(false);
  };

  const hint = !start
    ? t("projects.date_picker.hint_start")
    : !end
    ? t("projects.date_picker.hint_end")
    : null;

  return (
    <div className="flex gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn("min-w-0 flex-1 justify-start font-normal", !label && "text-muted-foreground")}
          >
            <CalendarDays className="text-muted-foreground" />
            <span className={cn("truncate", label && "tech")}>
              {label ?? t("projects.date_picker.range_placeholder")}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ from: start, to: end }}
            onSelect={handleSelect}
            defaultMonth={start}
            locale={dateFnsLocale(i18n.language)}
            weekStartsOn={i18n.language.startsWith("de") ? 1 : 0}
            initialFocus
          />
          <div className="flex min-h-11 items-center justify-between gap-3 border-t border-border px-3 py-1.5">
            <span className="text-xs text-muted-foreground">{hint}</span>
            {(start || end) && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined, undefined)}>
                {t("projects.date_picker.reset")}
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {(start || end) && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label={t("projects.date_picker.reset")}
          onClick={() => onChange(undefined, undefined)}
        >
          <X />
        </Button>
      )}
    </div>
  );
}
