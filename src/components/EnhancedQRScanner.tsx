import { ReactNode, useCallback, useEffect, useState } from "react";
import { hapticFeedback } from "@/lib/utils";
import type { InventoryItem } from "@/types/inventory";
import type { Project } from "@/types/project";
import { ScannerOverlay } from "@/components/scanner/ScannerOverlay";
import { ScanResultSheet, type ScanResult } from "@/components/scanner/ScanResultSheet";
import { parseScanCode } from "@/components/scanner/parseScanCode";
import type { ScanFeedback } from "@/components/scanner/types";

interface EnhancedQRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Items to resolve scanned codes against. */
  items: InventoryItem[];
  /** Enables the project list in the position details. */
  projects?: Project[];
  /** Called for every resolved item. May return feedback shown in the result sheet. */
  onItemFound?: (itemId: string) => ScanFeedback | void;
  onNavigateToItem?: (itemId: string) => void;
  /** Keep scanning after a successful scan (batch workflows). */
  continuous?: boolean;
  title?: string;
  subtitle?: ReactNode;
  count?: number;
}

/**
 * Scanner that resolves codes to inventory items and shows a result sheet
 * (name, status, id, position). Used by the scanner wizard.
 */
export function EnhancedQRScanner({
  isOpen,
  onClose,
  items,
  projects,
  onItemFound,
  onNavigateToItem,
  continuous = false,
  title,
  subtitle,
  count,
}: EnhancedQRScannerProps) {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [paused, setPaused] = useState(false);
  const [seq, setSeq] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setResult(null);
      setPaused(false);
    }
  }, [isOpen]);

  const handleCode = useCallback(
    (raw: string) => {
      setSeq((n) => n + 1);
      const itemId = parseScanCode(raw);
      if (!itemId) {
        hapticFeedback([50, 30, 50]);
        setResult({ kind: "invalid", code: raw.slice(0, 120) });
        setPaused(true);
        return;
      }
      const item = items.find((i) => i.id.toLowerCase() === itemId);
      if (!item) {
        hapticFeedback([50, 30, 50]);
        setResult({ kind: "not_found", code: itemId });
        setPaused(true);
        return;
      }
      const feedback: ScanFeedback | undefined = onItemFound?.(item.id) || undefined;
      const ok = !feedback || feedback.tone === "success";
      hapticFeedback(ok ? 60 : [50, 30, 50]);
      setResult({ kind: "item", item, feedback });
      setPaused(!continuous || feedback?.tone === "error");
    },
    [items, onItemFound, continuous]
  );

  const handleNext = () => {
    setResult(null);
    setPaused(false);
  };

  return (
    <ScannerOverlay
      open={isOpen}
      onClose={onClose}
      onCode={handleCode}
      paused={paused}
      title={title}
      subtitle={subtitle}
      count={count}
      result={
        result && (
          <ScanResultSheet
            key={seq}
            result={result}
            continuous={continuous && !paused}
            projects={projects}
            onNext={handleNext}
            onDone={onClose}
            onDetails={
              onNavigateToItem
                ? (id) => {
                    onNavigateToItem(id);
                    onClose();
                  }
                : undefined
            }
          />
        )
      }
    />
  );
}
