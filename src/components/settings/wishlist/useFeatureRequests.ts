import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type RequestStatus = "offen" | "geplant" | "in_arbeit" | "umgesetzt" | "abgelehnt";

export const STATUSES: RequestStatus[] = ["offen", "geplant", "in_arbeit", "umgesetzt", "abgelehnt"];
export const STATUS_ORDER: RequestStatus[] = ["in_arbeit", "geplant", "offen", "umgesetzt", "abgelehnt"];

export const STATUS_DOT: Record<RequestStatus, string> = {
  offen: "bg-muted-foreground/50",
  geplant: "bg-info",
  in_arbeit: "bg-warning",
  umgesetzt: "bg-success",
  abgelehnt: "bg-destructive",
};

export interface FeatureRequest {
  id: string;
  title: string;
  description: string | null;
  status: RequestStatus;
  votes: number;
  hasVoted: boolean;
}

const queryKey = (userId: string) => ["feature_requests", userId] as const;

const toStatus = (s: string): RequestStatus => (STATUSES.includes(s as RequestStatus) ? (s as RequestStatus) : "offen");

export function useFeatureRequests(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const key = queryKey(userId ?? "");
  const [pendingVotes, setPendingVotes] = useState<Set<string>>(() => new Set());

  const query = useQuery<FeatureRequest[]>({
    queryKey: key,
    enabled: !!userId,
    staleTime: 1000 * 60 * 3,
    queryFn: async () => {
      const { data: reqs, error } = await supabase
        .from("feature_requests")
        .select("*")
        .order("votes", { ascending: false });
      if (error) throw error;

      const { data: votes, error: votesError } = await supabase
        .from("feature_votes")
        .select("request_id")
        .eq("user_id", userId as string);
      if (votesError) throw votesError;

      const voted = new Set((votes ?? []).map((v) => v.request_id));
      return (reqs ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        status: toStatus(r.status),
        votes: r.votes,
        hasVoted: voted.has(r.id),
      }));
    },
  });

  const update = useCallback(
    (fn: (prev: FeatureRequest[]) => FeatureRequest[]) =>
      queryClient.setQueryData<FeatureRequest[]>(queryKey(userId ?? ""), (prev) => fn(prev ?? [])),
    [queryClient, userId]
  );

  const resync = useCallback(
    (descriptionKey: string) => {
      void queryClient.invalidateQueries({ queryKey: queryKey(userId ?? "") });
      toast({ title: t("common.error"), description: t(descriptionKey), variant: "destructive" });
    },
    [queryClient, toast, t, userId]
  );

  const toggleVote = async (req: FeatureRequest) => {
    if (!userId || pendingVotes.has(req.id)) return;
    setPendingVotes((s) => new Set(s).add(req.id));

    update((prev) =>
      prev
        .map((r) => (r.id === req.id ? { ...r, hasVoted: !r.hasVoted, votes: r.votes + (r.hasVoted ? -1 : 1) } : r))
        .sort((a, b) => b.votes - a.votes)
    );

    try {
      if (req.hasVoted) {
        const { error } = await supabase
          .from("feature_votes")
          .delete()
          .match({ request_id: req.id, user_id: userId });
        if (error) throw error;
        const { error: countError } = await supabase
          .from("feature_requests")
          .update({ votes: Math.max(0, req.votes - 1) })
          .eq("id", req.id);
        if (countError) throw countError;
      } else {
        const { error } = await supabase.from("feature_votes").insert({ request_id: req.id, user_id: userId });
        if (error) throw error;
        const { error: countError } = await supabase
          .from("feature_requests")
          .update({ votes: req.votes + 1 })
          .eq("id", req.id);
        if (countError) throw countError;
      }
    } catch {
      resync("wishlist.vote_error");
    } finally {
      setPendingVotes((s) => {
        const next = new Set(s);
        next.delete(req.id);
        return next;
      });
    }
  };

  const updateStatus = async (id: string, status: RequestStatus) => {
    update((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    const { error } = await supabase.from("feature_requests").update({ status }).eq("id", id);
    if (error) resync("wishlist.update_error");
  };

  const deleteRequest = async (id: string) => {
    update((prev) => prev.filter((r) => r.id !== id));
    const { error } = await supabase.from("feature_requests").delete().eq("id", id);
    if (error) resync("wishlist.update_error");
  };

  /** Returns true on success. */
  const submitRequest = async (title: string, description: string): Promise<boolean> => {
    const { error } = await supabase
      .from("feature_requests")
      .insert({ title: title.trim(), description: description.trim() || null });
    if (error) {
      toast({ title: t("common.error"), description: t("wishlist.submit_error"), variant: "destructive" });
      return false;
    }
    toast({ title: t("wishlist.submitted") });
    void queryClient.invalidateQueries({ queryKey: queryKey(userId ?? "") });
    return true;
  };

  return { ...query, key, pendingVotes, toggleVote, updateStatus, deleteRequest, submitRequest };
}
