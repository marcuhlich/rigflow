import { Trans, useTranslation } from "react-i18next";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ProjectStatus } from "@/types/project";

interface Props {
  pendingStatus: { from: ProjectStatus; to: ProjectStatus } | null;
  onCancelStatus: () => void;
  onConfirmStatus: (to: ProjectStatus) => void;
  deleteOpen: boolean;
  onDeleteOpenChange: (open: boolean) => void;
  onConfirmDelete: () => void;
}

/** Confirmation for unusual status jumps backwards, and for deleting the project. */
export function ProjectConfirmDialogs({
  pendingStatus, onCancelStatus, onConfirmStatus, deleteOpen, onDeleteOpenChange, onConfirmDelete,
}: Props) {
  const { t } = useTranslation();

  return (
    <>
      <AlertDialog open={!!pendingStatus} onOpenChange={v => !v && onCancelStatus()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("projects.status_change.warning_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatus && (
                <Trans
                  i18nKey="projects.status_change.warning_desc"
                  values={{
                    from: t(`project_status.${pendingStatus.from}`),
                    to: t(`project_status.${pendingStatus.to}`),
                  }}
                  components={{ strong: <strong className="font-medium text-foreground" /> }}
                />
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (pendingStatus) onConfirmStatus(pendingStatus.to); }}>
              {t("projects.status_change.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={onDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("projects.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("projects.delete.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
