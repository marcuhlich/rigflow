import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Confirm dialog for permanent account deletion. Requires typing the account email. */
export function DeleteAccountDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  const matches = !!user?.email && confirmEmail.trim().toLowerCase() === user.email.toLowerCase();

  const handleOpenChange = (next: boolean) => {
    if (deleting) return;
    if (!next) setConfirmEmail("");
    onOpenChange(next);
  };

  const handleDelete = async () => {
    if (!matches) {
      toast({
        title: t("account.email_mismatch_title"),
        description: t("account.email_mismatch_description"),
        variant: "destructive",
      });
      return;
    }

    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke<{ error?: string }>("delete-account");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    } catch {
      setDeleting(false);
      toast({
        title: t("common.error"),
        description: t("account.delete_error_description"),
        variant: "destructive",
      });
      return;
    }

    // Account is gone server-side; local sign-out failures must not block the redirect.
    try {
      await signOut();
    } catch {
      /* ignore */
    }
    toast({ title: t("account.deleted_title"), description: t("account.deleted_description") });
    navigate("/auth", { replace: true });
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("account.confirm_delete_title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("account.confirm_delete_intro")}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 text-sm">
          <ul className="list-inside list-disc space-y-1 text-foreground">
            <li>{t("account.delete_data_inventory")}</li>
            <li>{t("account.delete_data_checklists")}</li>
            <li>{t("account.delete_data_dmx")}</li>
            <li>{t("account.delete_data_audit")}</li>
          </ul>
          <p className="text-[13px] font-medium text-destructive">{t("account.confirm_delete_warning")}</p>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-delete-email">{t("account.confirm_email_label")}</Label>
            <Input
              id="confirm-delete-email"
              type="email"
              autoComplete="off"
              placeholder={user?.email ?? t("account.confirm_email_placeholder")}
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && matches && !deleting) void handleDelete();
              }}
              disabled={deleting}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
          <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting || !matches}>
            {deleting && <Loader2 className="animate-spin" />}
            {deleting ? t("account.deleting") : t("account.confirm_delete_button")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
