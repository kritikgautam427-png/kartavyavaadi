import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, useMyRoles } from "@/components/DashboardShell";
import { getAnalytics } from "@/lib/admin.functions";
import { PageHeader, Denied } from "./admin.conferences";
import { Users, Building2, MessagesSquare, Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/analytics")({ component: Page });

function Page() {
  const { data: me } = useMyRoles();
  const isSuper = me?.roles.includes("super_admin");
  const fetch = useServerFn(getAnalytics);
  const { data: stats } = useQuery({ queryKey: ["analytics"], queryFn: () => fetch(), enabled: !!isSuper });
  const { data: committees } = useQuery({
    queryKey: ["committees_min"],
    enabled: !!isSuper,
    queryFn: async () => (await supabase.from("committees").select("id, name, short_name")).data ?? [],
  });
  const { data: profiles } = useQuery({
    queryKey: ["profiles_min"],
    enabled: !!isSuper,
    queryFn: async () => (await supabase.from("profiles").select("id, display_name, email")).data ?? [],
  });
  if (!isSuper) return <DashboardShell><Denied /></DashboardShell>;

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const committeeMap = new Map((committees ?? []).map((c) => [c.id, c]));

  const topDelegates = Object.entries(stats?.topDelegates ?? {})
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 10);
  const perCom = Object.entries(stats?.perCommittee ?? {})
    .sort((a, b) => Number(b[1]) - Number(a[1]));
  const max = Math.max(1, ...perCom.map(([, v]) => Number(v)));

  return (
    <DashboardShell>
      <PageHeader title="Analytics" subtitle="Live snapshot of activity across the floor." />
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Stat icon={<Building2 />} label="Committees" value={stats?.counts.committees ?? 0} />
        <Stat icon={<Users />} label="Delegates" value={stats?.counts.delegates ?? 0} />
        <Stat icon={<MessagesSquare />} label="Chits" value={stats?.counts.chits ?? 0} />
        <Stat icon={<Trophy />} label="Scored" value={stats?.counts.scores ?? 0} />
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-sm border border-border bg-card p-6">
          <h3 className="font-display text-2xl">Chits per committee</h3>
          <div className="mt-4 space-y-3">
            {perCom.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
            {perCom.map(([cid, n]) => (
              <div key={cid}>
                <div className="flex justify-between text-xs"><span>{committeeMap.get(cid)?.short_name ?? "—"}</span><span className="text-muted-foreground">{n}</span></div>
                <div className="mt-1 h-2 rounded-sm bg-secondary"><div className="h-full rounded-sm bg-forest" style={{ width: `${(Number(n) / max) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-sm border border-border bg-card p-6">
          <h3 className="font-display text-2xl">Top delegates</h3>
          <ol className="mt-4 space-y-2 text-sm">
            {topDelegates.length === 0 && <p className="text-sm text-muted-foreground">No scores yet.</p>}
            {topDelegates.map(([uid, score], i) => (
              <li key={uid} className="flex items-center justify-between rounded-sm border border-border px-3 py-2">
                <span className="flex items-center gap-3"><span className="w-6 text-muted-foreground">#{i + 1}</span>{profileMap.get(uid)?.display_name ?? profileMap.get(uid)?.email ?? "Unknown"}</span>
                <span className="font-mono">{Number(score).toFixed(1)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </DashboardShell>
  );
}

function Stat({ icon, label, value }: any) {
  return (
    <div className="rounded-sm border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-forest">{icon}</span>
      </div>
      <div className="mt-3 font-display text-4xl">{value}</div>
    </div>
  );
}
