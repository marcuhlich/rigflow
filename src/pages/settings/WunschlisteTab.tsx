import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Lightbulb, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn, hapticFeedback } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/PageHeader";
import { EmptyPanel, ErrorState, ListSkeleton } from "@/components/QueryState";
import { FeatureRequestRow } from "@/components/settings/wishlist/FeatureRequestRow";
import { NewRequestForm } from "@/components/settings/wishlist/NewRequestForm";
import {
  STATUS_DOT,
  STATUS_ORDER,
  useFeatureRequests,
  type FeatureRequest,
} from "@/components/settings/wishlist/useFeatureRequests";

export default function WunschlisteTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = !!user?.app_metadata?.is_admin;

  const { data, isLoading, isError, error, refetch, pendingVotes, toggleVote, updateStatus, deleteRequest, submitRequest } =
    useFeatureRequests(user?.id);
  const requests = data ?? [];

  const [showForm, setShowForm] = useState(false);
  const [toDelete, setToDelete] = useState<FeatureRequest | null>(null);

  const handleSubmit = async (title: string, description: string) => {
    hapticFeedback(8);
    const ok = await submitRequest(title, description);
    if (ok) setShowForm(false);
    return ok;
  };

  const handleVote = (req: FeatureRequest) => {
    hapticFeedback(req.hasVoted ? 6 : [6, 30, 8]);
    void toggleVote(req);
  };

  const renderList = () => {
    if (isLoading) return <ListSkeleton rows={5} />;
    if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
    if (requests.length === 0) {
      return (
        <EmptyPanel
          icon={Lightbulb}
          title={t("wishlist.empty_title")}
          description={t("wishlist.empty_description")}
          action={
            !showForm && (
              <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
                <Plus />
                {t("wishlist.new_button")}
              </Button>
            )
          }
        />
      );
    }

    return (
      <div className="space-y-6">
        {STATUS_ORDER.map((status) => {
          const group = requests.filter((r) => r.status === status);
          if (group.length === 0) return null;
          return (
            <section key={status} className="space-y-2">
              <h2 className="eyebrow flex items-center gap-2 px-0.5">
                <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])} />
                {t(`wishlist.status.${status}`)}
                <span className="tech font-normal">{group.length}</span>
              </h2>
              <ul className="surface divide-y divide-border overflow-hidden">
                {group.map((req) => (
                  <FeatureRequestRow
                    key={req.id}
                    request={req}
                    isAdmin={isAdmin}
                    votePending={pendingVotes.has(req.id)}
                    onVote={() => handleVote(req)}
                    onStatusChange={(s) => void updateStatus(req.id, s)}
                    onDelete={() => setToDelete(req)}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    );
  };

  return (
    <div className="user-select-text space-y-6 pb-4">
      <PageHeader
        eyebrow={
          <Link to="/settings" className="inline-flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            {t("settings.title")}
          </Link>
        }
        title={t("account.wishlist_title")}
        description={
          isAdmin ? (
            <>
              {t("account.wishlist_description")} · <span className="text-foreground">{t("wishlist.admin_hint")}</span>
            </>
          ) : (
            t("account.wishlist_description")
          )
        }
        actions={
          !showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus />
              {t("wishlist.new_button")}
            </Button>
          )
        }
      />

      {showForm && <NewRequestForm onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />}

      {renderList()}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("wishlist.delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("wishlist.delete_description", { title: toDelete?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!toDelete) return;
                hapticFeedback([10, 60, 10]);
                void deleteRequest(toDelete.id);
              }}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
