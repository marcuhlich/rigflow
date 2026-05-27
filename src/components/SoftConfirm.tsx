// components/SoftConfirm.tsx
import { useState, ReactNode } from "react";
import { useTranslation } from "react-i18next";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

interface SoftConfirmProps {
  trigger: ReactNode;
  title: string;
  description: string;
  onConfirm: () => void;

  confirmText?: string;
  cancelText?: string;

  variant?: "default" | "destructive";
}

export function SoftConfirm({
  trigger,
  title,
  description,
  onConfirm,
  confirmText,
  cancelText,
  variant = "destructive",
}: SoftConfirmProps) {
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>

          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
          >
            {cancelText ?? t("common.cancel")}
          </Button>

          <Button
            variant={variant}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            {confirmText ?? t("common.confirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}