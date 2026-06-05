import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, useMyRoles } from "@/components/DashboardShell";
import { createChit, finalizeChitScore, rescoreChit } from "@/lib/chits.functions";
import { toast } from "sonner";
import { Trophy, Sparkles, Send, CheckCircle2, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/committee/$committeeId")({
  component: CommitteePage,
});

const CHIT_TYPES = [
  { v: "POI", label: "Point of Information" },
  { v: "POO", label: "Point of Order" },
  { v: "POE", label: "Point of Enquiry" },
  { v: "POP", label: "Point of Personal Privilege" },
  { v: "SUBSTANTIVE", label: "Substantive Chit" },
  { v: "REPLY", label: "Reply Chit" },
] as const;

function CommitteePage() {
  const { committeeId } = useParams({ from: "/_authenticated/committee/$committeeId" });
  const { data: me } = useMyRoles();
  const qc = useQueryClient();

  const { data: committee } = useQuery({
    queryKey: ["committee", committeeId],
    queryFn: async () => {
      const { data } = await supabase.from("committees").select("*").eq("id", committeeId).single();
      return data;
    },
  });

  const { data: myPortfolio } = useQuery({
    queryKey: ["my_portfolio", committeeId, me?.userId],
    queryFn: async () => {
      if (!me?.userId) return null;
      const { data } = await supabase
        .from("portfolios")
        .select("*")
        .eq("committee_id", committeeId)
        .eq("delegate_user_id", me.userId)
        .maybeSingle();
      return data;
    },
    enabled: !!me?.userId,
  });

  const { data: isEB } = useQuery({
    queryKey: ["is_eb", committeeId, me?.userId],
    queryFn: async () => {
      if (!me?.userId) return false;
      if (me.roles.includes("super_admin")) return true;
      const { data } = await supabase
        .from("committee_eb")
        .select("id")
        .eq("committee_id", committeeId)
        .eq("user_id", me.userId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!me?.userId,
  });

  const { data: portfolios } = useQuery({
    queryKey: ["portfolios", committeeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("portfolios")
        .select("id, name, delegate_user_id")
        .eq("committee_id", committeeId)
        .order("name");
      return data ?? [];
    },
  });

  const { data: visibility } = useQuery({
    queryKey: ["visibility", committeeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("score_visibility")
        .select("*")
        .eq("committee_id", committeeId)
        .maybeSingle();
      return data;
    },
  });

  const { data: chits, refetch: refetchChits } = useQuery({
    queryKey: ["chits", committeeId, isEB, me?.userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("chits")
        .select(
          "id, chit_type, target_kind, body, status, created_at, sender_user_id, sender_portfolio_id, target_portfolio_id, chit_scores(ai_recommended_score, ai_breakdown, ai_justification, ai_strengths, ai_weaknesses, final_score, final_breakdown, override_reason)"
        )
        .eq("committee_id", committeeId)
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
    enabled: !!me?.userId,
  });

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel(`committee_${committeeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chits", filter: `committee_id=eq.${committeeId}` }, () => {
        qc.invalidateQueries({ queryKey: ["chits", committeeId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chit_scores", filter: `committee_id=eq.${committeeId}` }, () => {
        qc.invalidateQueries({ queryKey: ["chits", committeeId] });
        qc.invalidateQueries({ queryKey: ["leaderboard", committeeId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [committeeId, qc]);

  return (
    <DashboardShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/dashboard" className="text-xs text-muted-foreground hover:underline">
            ← Back
          </Link>
          <div className="mt-2 divider-rule">{committee?.short_name}</div>
          <h1 className="mt-3 font-display text-4xl">{committee?.name}</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">{committee?.agenda}</p>
        </div>
        {myPortfolio && (
          <div className="rounded-sm border border-border bg-card px-5 py-4 text-right">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Your portfolio</div>
            <div className="mt-1 font-display text-xl">{myPortfolio.name}</div>
          </div>
        )}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div>
          {myPortfolio && !isEB && (
            <ChitComposer
              committeeId={committeeId}
              portfolios={portfolios ?? []}
              myPortfolioId={myPortfolio.id}
            />
          )}
          <ChitsList
            chits={chits ?? []}
            portfolios={portfolios ?? []}
            isEB={!!isEB}
            committeeId={committeeId}
            visibilityMode={visibility?.mode ?? "HIDDEN"}
            meUserId={me?.userId ?? null}
            onRefresh={() => refetchChits()}
          />
        </div>
        <aside className="space-y-6">
          <Leaderboard committeeId={committeeId} visibilityMode={visibility?.mode ?? "HIDDEN"} isEB={!!isEB} meUserId={me?.userId ?? null} />
          {isEB && <EBSettings committeeId={committeeId} />}
        </aside>
      </div>
    </DashboardShell>
  );
}

function ChitComposer({
  committeeId,
  portfolios,
  myPortfolioId,
}: {
  committeeId: string;
  portfolios: any[];
  myPortfolioId: string;
}) {
  const send = useServerFn(createChit);
  const qc = useQueryClient();
  const [type, setType] = useState<string>("POI");
  const [target, setTarget] = useState<"EXECUTIVE_BOARD" | "PORTFOLIO">("EXECUTIVE_BOARD");
  const [targetPortfolio, setTargetPortfolio] = useState<string>("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (body.trim().length < 2) return;
    setBusy(true);
    try {
      await send({
        data: {
          committee_id: committeeId,
          sender_portfolio_id: myPortfolioId,
          chit_type: type as any,
          target_kind: target,
          target_portfolio_id: target === "PORTFOLIO" ? targetPortfolio : undefined,
          body,
        },
      });
      toast.success("Chit submitted — AI is scoring it now.");
      setBody("");
      qc.invalidateQueries({ queryKey: ["chits", committeeId] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to send");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-sm border border-border bg-card p-6">
      <h2 className="font-display text-2xl">Compose a chit</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-2 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
          >
            {CHIT_TYPES.map((t) => (
              <option key={t.v} value={t.v}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">To</label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value as any)}
            className="mt-2 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="EXECUTIVE_BOARD">Executive Board</option>
            <option value="PORTFOLIO">Another Portfolio</option>
          </select>
        </div>
        {target === "PORTFOLIO" && (
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Portfolio</label>
            <select
              value={targetPortfolio}
              onChange={(e) => setTargetPortfolio(e.target.value)}
              required
              className="mt-2 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— Select —</option>
              {portfolios
                .filter((p) => p.id !== myPortfolioId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>
      <div className="mt-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Body</label>
        <textarea
          required
          minLength={2}
          maxLength={4000}
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="mt-2 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
          placeholder="Write your chit. Cite facts, propose action, stay in character."
        />
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{body.length} / 4000</span>
        <button
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-sm bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> {busy ? "Sending…" : "Send chit"}
        </button>
      </div>
    </form>
  );
}

function ChitsList({
  chits,
  portfolios,
  isEB,
  committeeId,
  visibilityMode,
  meUserId,
  onRefresh,
}: {
  chits: any[];
  portfolios: any[];
  isEB: boolean;
  committeeId: string;
  visibilityMode: string;
  meUserId: string | null;
  onRefresh: () => void;
}) {
  const pById = Object.fromEntries(portfolios.map((p) => [p.id, p]));
  return (
    <div className="mt-8 space-y-4">
      <h2 className="font-display text-2xl">Chit feed</h2>
      {!chits.length && (
        <div className="rounded-sm border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No chits yet.
        </div>
      )}
      {chits.map((c) => (
        <ChitRow
          key={c.id}
          chit={c}
          isEB={isEB}
          isMine={c.sender_user_id === meUserId}
          visibilityMode={visibilityMode}
          senderName={pById[c.sender_portfolio_id]?.name ?? "—"}
          targetName={
            c.target_kind === "EXECUTIVE_BOARD" ? "Executive Board" : pById[c.target_portfolio_id]?.name ?? "—"
          }
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}

function ChitRow({
  chit,
  isEB,
  isMine,
  visibilityMode,
  senderName,
  targetName,
  onRefresh,
}: {
  chit: any;
  isEB: boolean;
  isMine: boolean;
  visibilityMode: string;
  senderName: string;
  targetName: string;
  onRefresh: () => void;
}) {
  const score = chit.chit_scores?.[0] ?? chit.chit_scores;
  const hasScore = score && score.ai_recommended_score != null;
  const isFinal = score?.final_score != null;
  const [showFinalize, setShowFinalize] = useState(false);
  const [editScore, setEditScore] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState("");
  const finalize = useServerFn(finalizeChitScore);
  const rescore = useServerFn(rescoreChit);

  const showScore =
    isEB ||
    (isMine &&
      (visibilityMode === "TOTAL_ONLY" || visibilityMode === "BREAKDOWN"));
  const showBreakdown = isEB || (isMine && visibilityMode === "BREAKDOWN");

  const submitFinal = async () => {
    const v = parseFloat(editScore);
    if (Number.isNaN(v)) {
      toast.error("Enter a number");
      return;
    }
    await finalize({
      data: {
        chit_id: chit.id,
        final_score: v,
        override_reason: overrideReason || undefined,
      },
    });
    toast.success("Score finalized");
    setShowFinalize(false);
    onRefresh();
  };

  const doRescore = async () => {
    await rescore({ data: { chit_id: chit.id } });
    toast.success("Re-scored");
    onRefresh();
  };

  return (
    <div className="rounded-sm border border-border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-sm bg-forest px-2 py-0.5 font-semibold uppercase tracking-wider text-ivory">
          {chit.chit_type}
        </span>
        <span>{senderName}</span>
        <span>→</span>
        <span>{targetName}</span>
        <span className="ml-auto">{new Date(chit.created_at).toLocaleString()}</span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{chit.body}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
        <span
          className={`rounded-sm px-2 py-1 font-semibold uppercase tracking-wider ${
            chit.status === "FINALIZED"
              ? "bg-emerald-100 text-emerald-900"
              : chit.status === "AI_SCORED"
                ? "bg-amber-100 text-amber-900"
                : "bg-secondary"
          }`}
        >
          {chit.status}
        </span>
        {hasScore && showScore && (
          <span className="text-muted-foreground">
            AI: <span className="font-semibold text-foreground">{Number(score.ai_recommended_score).toFixed(1)}</span>
          </span>
        )}
        {isFinal && showScore && (
          <span className="text-muted-foreground">
            Final: <span className="font-semibold text-foreground">{Number(score.final_score).toFixed(1)}</span>
          </span>
        )}
      </div>

      {hasScore && showBreakdown && (
        <div className="mt-4 rounded-sm border border-border bg-secondary/40 p-4 text-xs">
          <div className="font-semibold uppercase tracking-wider text-muted-foreground">AI breakdown</div>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {(score.ai_breakdown ?? []).map((b: any) => (
              <li key={b.criterion}>
                {b.criterion}: <span className="font-semibold">{b.score}</span>
              </li>
            ))}
          </ul>
          {score.ai_justification && (
            <p className="mt-3 text-foreground/80"><span className="font-semibold">Why:</span> {score.ai_justification}</p>
          )}
          {score.ai_strengths && (
            <p className="mt-2 text-emerald-900/80"><span className="font-semibold">Strengths:</span> {score.ai_strengths}</p>
          )}
          {score.ai_weaknesses && (
            <p className="mt-2 text-amber-900/80"><span className="font-semibold">Weaknesses:</span> {score.ai_weaknesses}</p>
          )}
        </div>
      )}

      {isEB && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={doRescore}
            className="inline-flex items-center gap-1 rounded-sm border border-border px-3 py-2 text-xs hover:bg-secondary"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Re-score
          </button>
          <button
            onClick={() => {
              setShowFinalize(!showFinalize);
              setEditScore(hasScore ? String(score.ai_recommended_score) : "");
            }}
            className="inline-flex items-center gap-1 rounded-sm bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> {isFinal ? "Edit final" : "Finalize"}
          </button>
        </div>
      )}

      {isEB && showFinalize && (
        <div className="mt-4 rounded-sm border border-primary/40 bg-primary/5 p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Final score
              </label>
              <input
                type="number"
                step="0.1"
                value={editScore}
                onChange={(e) => setEditScore(e.target.value)}
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Override reason (optional)
              </label>
              <input
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            onClick={submitFinal}
            className="mt-3 rounded-sm bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            Save final score
          </button>
        </div>
      )}
    </div>
  );
}

function Leaderboard({
  committeeId,
  visibilityMode,
  isEB,
  meUserId,
}: {
  committeeId: string;
  visibilityMode: string;
  isEB: boolean;
  meUserId: string | null;
}) {
  const { data } = useQuery({
    queryKey: ["leaderboard", committeeId],
    queryFn: async () => {
      const { data: scores } = await supabase
        .from("chit_scores")
        .select("delegate_user_id, final_score, ai_recommended_score")
        .eq("committee_id", committeeId);
      const { data: ports } = await supabase
        .from("portfolios")
        .select("name, delegate_user_id")
        .eq("committee_id", committeeId)
        .not("delegate_user_id", "is", null);
      const totals: Record<string, { total: number; count: number; name: string }> = {};
      (ports ?? []).forEach((p: any) => {
        if (p.delegate_user_id) totals[p.delegate_user_id] = { total: 0, count: 0, name: p.name };
      });
      (scores ?? []).forEach((s: any) => {
        const v = s.final_score ?? s.ai_recommended_score ?? 0;
        if (!totals[s.delegate_user_id]) return;
        totals[s.delegate_user_id].total += Number(v);
        totals[s.delegate_user_id].count += 1;
      });
      return Object.entries(totals)
        .map(([uid, v]) => ({ uid, ...v }))
        .sort((a, b) => b.total - a.total);
    },
  });

  const showAll = isEB || visibilityMode === "TOTAL_ONLY" || visibilityMode === "BREAKDOWN";
  return (
    <div className="rounded-sm border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-gold" />
        <h2 className="font-display text-xl">Leaderboard</h2>
      </div>
      {!showAll && (
        <p className="mt-2 text-xs text-muted-foreground">
          Scores are currently hidden by the EB.
        </p>
      )}
      <ol className="mt-4 space-y-2 text-sm">
        {data?.map((d, i) => {
          const isMe = d.uid === meUserId;
          const visible = showAll || isMe;
          return (
            <li
              key={d.uid}
              className={`flex items-center justify-between rounded-sm px-3 py-2 ${
                isMe ? "bg-primary/10 font-semibold" : "bg-secondary/40"
              }`}
            >
              <span>
                <span className="mr-2 inline-block w-5 text-right text-muted-foreground">{i + 1}.</span>
                {visible ? d.name : "—"}
              </span>
              <span className="font-display text-lg">{visible ? d.total.toFixed(1) : "•••"}</span>
            </li>
          );
        })}
        {!data?.length && <li className="text-xs text-muted-foreground">No scores yet.</li>}
      </ol>
    </div>
  );
}

function EBSettings({ committeeId }: { committeeId: string }) {
  const qc = useQueryClient();
  const { data: criteria } = useQuery({
    queryKey: ["criteria", committeeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("scoring_criteria")
        .select("*")
        .eq("committee_id", committeeId)
        .order("sort_order");
      return data ?? [];
    },
  });
  const { data: vis } = useQuery({
    queryKey: ["vis_local", committeeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("score_visibility")
        .select("*")
        .eq("committee_id", committeeId)
        .maybeSingle();
      return data;
    },
  });

  const updateCriterion = async (id: string, patch: any) => {
    const { error } = await supabase.from("scoring_criteria").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["criteria", committeeId] });
  };
  const setVisibility = async (mode: string) => {
    const payload = { committee_id: committeeId, mode: mode as any };
    const { error } = await supabase.from("score_visibility").upsert(payload, { onConflict: "committee_id" });
    if (error) toast.error(error.message);
    else {
      toast.success("Visibility updated");
      qc.invalidateQueries({ queryKey: ["visibility", committeeId] });
      qc.invalidateQueries({ queryKey: ["vis_local", committeeId] });
    }
  };

  return (
    <div className="rounded-sm border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="font-display text-xl">EB controls</h2>
      </div>
      <div className="mt-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Score visibility
        </div>
        <select
          value={vis?.mode ?? "HIDDEN"}
          onChange={(e) => setVisibility(e.target.value)}
          className="mt-2 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="HIDDEN">Hidden from delegates</option>
          <option value="TOTAL_ONLY">Show total only</option>
          <option value="BREAKDOWN">Show full breakdown</option>
          <option value="REVEAL_AFTER_END">Reveal after committee ends</option>
        </select>
      </div>
      <div className="mt-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Scoring criteria (weights %)
        </div>
        <div className="mt-3 space-y-2 text-sm">
          {criteria?.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={c.enabled}
                onChange={(e) => updateCriterion(c.id, { enabled: e.target.checked })}
              />
              <span className="flex-1">{c.name}</span>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                value={Number(c.weight)}
                onChange={(e) => updateCriterion(c.id, { weight: Number(e.target.value) })}
                className="w-20 rounded-sm border border-input bg-background px-2 py-1 text-right text-sm"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
