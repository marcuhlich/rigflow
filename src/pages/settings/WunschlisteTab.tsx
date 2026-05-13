import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { hapticFeedback } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronLeft, Sparkles, ChevronUp, Loader2,
  Lightbulb, ShieldCheck, Trash2, MessageSquarePlus,
} from "lucide-react";

type Status = "offen" | "geplant" | "in_arbeit" | "umgesetzt" | "abgelehnt";

interface FeatureRequest {
  id: string;
  title: string;
  description: string | null;
  status: Status;
  votes: number;
  hasVoted?: boolean;
}

const STATUS_META: Record<Status, { label: string }> = {
  offen:     { label: "Offen"     },
  geplant:   { label: "Geplant"   },
  in_arbeit: { label: "In Arbeit" },
  umgesetzt: { label: "Umgesetzt" },
  abgelehnt: { label: "Abgelehnt" },
};

const STATUS_DOT: Record<Status, string> = {
  offen:     "bg-muted-foreground/40",
  geplant:   "bg-blue-400",
  in_arbeit: "bg-warning",
  umgesetzt: "bg-success",
  abgelehnt: "bg-destructive",
};

const STATUS_ORDER: Status[] = ["in_arbeit", "geplant", "offen", "umgesetzt", "abgelehnt"];

const QUERY_KEY = (userId: string) => ["feature_requests", userId];

export default function WunschlisteTab() {
  const { user }      = useAuth();
  const isAdmin       = !!user?.app_metadata?.is_admin;
  const navigate      = useNavigate();
  const isMobile      = useIsMobile();
  const queryClient   = useQueryClient();

  const [showForm,       setShowForm]       = useState(false);
  const [title,          setTitle]          = useState("");
  const [description,    setDescription]    = useState("");
  const [submitting,     setSubmitting]     = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [pressedId,      setPressedId]      = useState<string | null>(null);

  // ── Press-Animation: Bounce nur auf Touch ──────────────────────────────────
  const press = (id: string) => {
    if (!isMobile) return;
    setPressedId(id);
    hapticFeedback(6);
    setTimeout(() => setPressedId(null), 140);
  };

  const cardScale = (id: string): React.CSSProperties =>
    isMobile
      ? {
          transform:  pressedId === id ? "scale(0.97)" : "scale(1)",
          transition: "transform 0.12s cubic-bezier(0.34,1.56,0.64,1)",
        }
      : {};

  // ── Gecachte Daten via useQuery ────────────────────────────────────────────
  const { data: requests = [], isLoading } = useQuery<FeatureRequest[]>({
    queryKey: QUERY_KEY(user?.id ?? ""),
    enabled:  !!user,
    staleTime: 1000 * 60 * 3, // 3 Min. Cache – kein Reload beim Tab-Wechsel
    queryFn: async () => {
      const { data: reqs } = await supabase
        .from("feature_requests").select("*").order("votes", { ascending: false });
      if (!reqs) return [];

      const { data: votes } = await supabase
        .from("feature_votes").select("request_id").eq("user_id", user!.id);

      const votedIds = new Set(votes?.map((v) => v.request_id) ?? []);
      return reqs.map((r): FeatureRequest => ({
        id: r.id, title: r.title, description: r.description,
        status: r.status as Status, votes: r.votes,
        hasVoted: votedIds.has(r.id),
      }));
    },
  });

  // ── Optimistic Update Helper ───────────────────────────────────────────────
  const updateCache = (updater: (prev: FeatureRequest[]) => FeatureRequest[]) => {
    queryClient.setQueryData<FeatureRequest[]>(QUERY_KEY(user?.id ?? ""), (prev) =>
      updater(prev ?? [])
    );
  };

  // ── Vote ───────────────────────────────────────────────────────────────────
  const toggleVote = async (req: FeatureRequest) => {
    if (!user) return;
    hapticFeedback(req.hasVoted ? 6 : [6, 30, 8]);

    // Optimistic
    updateCache((prev) =>
      prev.map((r) => r.id === req.id
        ? { ...r, hasVoted: !r.hasVoted, votes: r.votes + (r.hasVoted ? -1 : 1) }
        : r
      ).sort((a, b) => b.votes - a.votes)
    );

    if (req.hasVoted) {
      await supabase.from("feature_votes").delete().match({ request_id: req.id, user_id: user.id });
      await supabase.from("feature_requests").update({ votes: req.votes - 1 }).eq("id", req.id);
    } else {
      await supabase.from("feature_votes").insert({ request_id: req.id, user_id: user.id });
      await supabase.from("feature_requests").update({ votes: req.votes + 1 }).eq("id", req.id);
    }
  };

  // ── Status ändern (Admin) ──────────────────────────────────────────────────
  const updateStatus = async (id: string, status: Status) => {
    setUpdatingStatus(id);
    updateCache((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    await supabase.from("feature_requests").update({ status }).eq("id", id);
    setUpdatingStatus(null);
  };

  // ── Löschen (Admin) ───────────────────────────────────────────────────────
  const deleteRequest = async (id: string) => {
    hapticFeedback([10, 60, 10]);
    updateCache((prev) => prev.filter((r) => r.id !== id));
    await supabase.from("feature_requests").delete().eq("id", id);
  };

  // ── Einreichen ─────────────────────────────────────────────────────────────
  const submitRequest = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    hapticFeedback(8);
    const { error } = await supabase
      .from("feature_requests")
      .insert({ title: title.trim(), description: description.trim() || null });
    if (!error) {
      setTitle(""); setDescription(""); setShowForm(false);
      // Cache invalidieren damit neuer Eintrag erscheint
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(user?.id ?? "") });
    }
    setSubmitting(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 pb-24 px-0">

      {/* Header */}
      <div className="flex items-center gap-2 mt-4 px-1">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg hover:bg-muted/50 active:scale-95 transition-all text-muted-foreground shrink-0"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            Wunschliste
          </h2>
          <p className="text-xs text-muted-foreground truncate">
            Funktionen vorschlagen
          </p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); hapticFeedback(6); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg font-medium
                      transition-all active:scale-95 shrink-0 ${
            showForm
              ? "bg-muted text-muted-foreground hover:bg-muted/80"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          {showForm ? "Abbrechen" : "Vorschlag"}
        </button>
      </div>

      {/* Admin-Banner */}
      {isAdmin && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/25">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs text-primary font-medium">
            Admin-Ansicht – Status ändern &amp; löschen aktiv
          </p>
        </div>
      )}

      {/* Formular */}
      {showForm && (
        <Card className="glass-card border-primary/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Neuer Vorschlag</p>
            </div>
            <input
              className="w-full rounded-lg px-3 py-2 text-sm bg-muted/30 border border-border/60
                         placeholder:text-muted-foreground focus:outline-none focus:ring-2
                         focus:ring-primary/40 focus:border-primary/50 transition-all"
              placeholder="Funktion kurz beschreiben *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <textarea
              className="w-full rounded-lg px-3 py-2 text-sm bg-muted/30 border border-border/60
                         placeholder:text-muted-foreground focus:outline-none focus:ring-2
                         focus:ring-primary/40 focus:border-primary/50 transition-all resize-none"
              placeholder="Details (optional)"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">{title.length}/100</p>
              <button
                onClick={submitRequest}
                disabled={submitting || !title.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground
                           text-sm rounded-lg font-medium disabled:opacity-50 active:scale-95 transition-all"
              >
                {submitting
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Wird eingereicht…</>
                  : "Einreichen"
                }
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin opacity-40" />
          <p className="text-sm">Lädt…</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <div className="p-4 rounded-full bg-muted/30">
            <Sparkles className="h-8 w-8 opacity-30" />
          </div>
          <div>
            <p className="text-sm font-medium">Noch keine Vorschläge</p>
            <p className="text-xs mt-1 opacity-60">Sei der Erste und schlage eine Funktion vor!</p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {STATUS_ORDER.map((status) => {
            const group = requests.filter((r) => r.status === status);
            if (group.length === 0) return null;
            const maxVotes = Math.max(...requests.map((r) => r.votes), 1);
            return (
              <div key={status}>
                {/* Gruppenheader */}
                <div className="flex items-center gap-2 mb-2.5 px-1">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[status]}`} />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {STATUS_META[status].label}
                  </span>
                  <span className="text-xs text-muted-foreground/50 font-medium">{group.length}</span>
                  <div className="flex-1 h-px bg-border/40" />
                </div>

                <ul className="space-y-2.5">
                  {group.map((req, idx) => (
                    <li
                      key={req.id}
                      className="glass-card overflow-hidden"
                      style={{ ...cardScale(req.id), animationDelay: `${idx * 40}ms` }}
                    >
                      <div className="flex gap-3 p-4 items-start">

                        {/* Vote-Button */}
                        <button
                          onPointerDown={() => press(req.id)}
                          onClick={() => toggleVote(req)}
                          className={`flex flex-col items-center min-w-[44px] rounded-xl py-2 px-2 border
                                      transition-colors shrink-0 ${
                            req.hasVoted
                              ? "bg-primary/15 border-primary/50 text-primary"
                              : "bg-muted/30 border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary"
                          }`}
                        >
                          <ChevronUp className={`h-4 w-4 transition-transform duration-150 ${req.hasVoted ? "scale-110" : ""}`} />
                          <span className="text-sm font-bold leading-none mt-0.5">{req.votes}</span>
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-start gap-2 flex-wrap">
                            <span className="font-semibold text-sm leading-snug flex-1 min-w-0">
                              {req.title}
                            </span>

                            {isAdmin && (
                              <div className="relative shrink-0">
                                <div className={`h-2 w-2 rounded-full absolute left-2 top-1/2 -translate-y-1/2 ${STATUS_DOT[status]}`} />
                                <select
                                  value={req.status}
                                  disabled={updatingStatus === req.id}
                                  onChange={(e) => updateStatus(req.id, e.target.value as Status)}
                                  className="pl-5 pr-2 py-0.5 text-xs rounded-full border border-border/60
                                             bg-muted/40 cursor-pointer disabled:opacity-50 focus:outline-none
                                             focus:ring-1 focus:ring-primary/40 appearance-none"
                                >
                                  {(Object.keys(STATUS_META) as Status[]).map((s) => (
                                    <option key={s} value={s}>{STATUS_META[s].label}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>

                          {req.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {req.description}
                            </p>
                          )}

                          {isAdmin && (
                            <button
                              onClick={() => deleteRequest(req.id)}
                              className="flex items-center gap-1 mt-1 text-[11px] text-destructive/70
                                         hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                              Löschen
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Vote-Balken */}
                      {req.votes > 0 && (
                        <div className="h-[2px] bg-muted/20 mx-4 mb-3 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/50 rounded-full transition-all duration-500"
                            style={{ width: `${(req.votes / maxVotes) * 100}%` }}
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}