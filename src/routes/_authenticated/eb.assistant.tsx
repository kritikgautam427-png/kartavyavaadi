import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, useMyRoles } from "@/components/DashboardShell";
import { ebAssistantAnalyze } from "@/lib/chits.functions";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/eb/assistant")({
  component: EBAssistant,
});

function EBAssistant() {
  const { data: me } = useMyRoles();
  const analyze = useServerFn(ebAssistantAnalyze);
  const [committee, setCommittee] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const { data: committees } = useQuery({
    queryKey: ["eb_committees", me?.userId],
    queryFn: async () => {
      if (!me?.userId) return [];
      if (me.roles.includes("super_admin")) {
        const { data } = await supabase.from("committees").select("id, name");
        return data ?? [];
      }
      const { data } = await supabase
        .from("committee_eb")
        .select("committee_id, committees(id, name)")
        .eq("user_id", me.userId);
      return (data ?? []).map((d: any) => ({ id: d.committees.id, name: d.committees.name }));
    },
    enabled: !!me?.userId,
  });

  const run = async () => {
    if (!committee || text.trim().length < 5) {
      toast.error("Choose a committee and paste text first.");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const r = await analyze({ data: { committee_id: committee, text } });
      setResult(r);
    } catch (e: any) {
      toast.error(e.message ?? "Analysis failed");
    } finally {
      setBusy(false);
    }
  };

  const isEligible = me?.roles.includes("executive_board") || me?.roles.includes("super_admin");
  if (!isEligible) {
    return (
      <DashboardShell>
        <div className="rounded-sm border border-border bg-card p-10 text-center">
          <h1 className="font-display text-3xl">EB Assistant</h1>
          <p className="mt-2 text-muted-foreground">
            This tool is only available to Executive Board members and Super Admins.
          </p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="divider-rule">EB Tools</div>
      <h1 className="mt-3 font-display text-4xl">EB Assistant</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Paste a chit, speech transcript, intervention or any committee text. The Assistant returns
        an advisory score against this committee's active criteria. <strong>Recommendations are
        advisory only</strong> — only the EB can finalize scores against actual chits.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-sm border border-border bg-card p-6">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Committee
          </label>
          <select
            value={committee}
            onChange={(e) => setCommittee(e.target.value)}
            className="mt-2 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— Select —</option>
            {committees?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Text to analyze
          </label>
          <textarea
            rows={14}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="mt-2 w-full rounded-sm border border-input bg-background px-3 py-2 font-mono text-sm"
            placeholder="Paste a chit, speech transcript, intervention notes, or any committee text…"
          />
          <button
            onClick={run}
            disabled={busy}
            className="mt-4 inline-flex items-center gap-2 rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" /> {busy ? "Analyzing…" : "Analyze"}
          </button>
        </div>

        <div className="rounded-sm border border-border bg-card p-6">
          <h2 className="font-display text-xl">Recommendation</h2>
          {!result && (
            <p className="mt-2 text-sm text-muted-foreground">
              Results will appear here. The EB makes the final call.
            </p>
          )}
          {result && (
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  Suggested score
                </div>
                <div className="mt-1 font-display text-5xl text-primary">
                  {Number(result.overall_score).toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Breakdown
                </div>
                <ul className="mt-2 grid gap-1">
                  {result.breakdown?.map((b: any) => (
                    <li key={b.criterion} className="flex justify-between">
                      <span>{b.criterion}</span>
                      <span className="font-semibold">{b.score}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Justification
                </div>
                <p className="mt-1 text-foreground/85">{result.justification}</p>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-900/70">
                  Strengths
                </div>
                <p className="mt-1 text-foreground/85">{result.strengths}</p>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-900/70">
                  Weaknesses
                </div>
                <p className="mt-1 text-foreground/85">{result.weaknesses}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
