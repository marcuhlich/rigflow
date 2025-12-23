// components/SoftConfirm.tsx
import { useState, ReactNode } from "react";
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
  trigger: ReactNode;           // Button oder Icon, das den Dialog öffnet
  title: string;                // Titel des Dialogs
  description: string;          // Beschreibungstext
  onConfirm: () => void;        // Callback, wenn der Nutzer bestätigt
  confirmText?: string;         // Text des Bestätigen-Buttons
  cancelText?: string;          // Text des Abbrechen-Buttons
  variant?: "default" | "destructive";
}

export function SoftConfirm({
  trigger,
  title,
  description,
  onConfirm,
  confirmText = "Bestätigen",
  cancelText = "Abbrechen",
  variant = "destructive",
}: SoftConfirmProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
