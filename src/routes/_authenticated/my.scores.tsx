import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, useMyRoles } from "@/components/DashboardShell";
import { TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/my/scores")({ component: Page });

function Page() {
  const { data: me } = useMyRoles();
  const { data: scores } = useQuery({
    queryKey: ["my_scores", me?.userId],
    enabled: !!me?.userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("chit_scores")
        .select("*, chits(body, chit_type, created_at), committees(name, short_name)")
        .eq("delegate_user_id", me!.userId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const total = (scores ?? []).reduce((s, r: any) => s + Number(r.final_score ?? r.ai_recommended_score ?? 0), 0);
  const avg = scores?.length ? total / scores.length : 0;

  return (
    <DashboardShell>
      <div className="divider-rule">Performance</div>
      <h1 className="mt-3 font-display text-4xl">My scores</h1>
      <p className="mt-2 text-sm text-muted-foreground">Every chit you've submitted with AI feedback and finalized scores.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Stat label="Chits scored" value={scores?.length ?? 0} />
        <Stat label="Cumulative" value={total.toFixed(1)} />
        <Stat label="Average" value={avg.toFixed(1)} />
      </div>

      <div className="mt-10 grid gap-4">
        {(!scores || scores.length === 0) && <div className="rounded-sm border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No scored chits yet.</div>}
        {scores?.map((s: any) => {
          const final = s.final_score != null;
          const score = final ? s.final_score : s.ai_recommended_score;
          return (
            <div key={s.id} className="rounded-sm border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {s.committees?.short_name} · {s.chits?.chit_type} · {new Date(s.chits?.created_at ?? s.created_at).toLocaleString()}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm">{s.chits?.body}</p>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${final ? "bg-forest text-ivory" : "bg-secondary text-muted-foreground"}`}>
                    <TrendingUp className="h-3 w-3" /> {final ? "Final" : "AI rec."}
                  </div>
                  <div className="mt-1 font-display text-3xl">{Number(score ?? 0).toFixed(1)}</div>
                </div>
              </div>
              {s.ai_justification && <p className="mt-3 rounded-sm bg-secondary/50 p-3 text-xs italic text-muted-foreground">{s.ai_justification}</p>}
            </div>
          );
        })}
      </div>
    </DashboardShell>
  );
}

function Stat({ label, value }: any) {
  return (
    <div className="rounded-sm border border-border bg-card p-6">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-4xl">{value}</div>
    </div>
  );
}
