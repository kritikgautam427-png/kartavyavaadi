import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, RoleBadge, useMyRoles } from "@/components/DashboardShell";
import { ArrowRight, MessagesSquare, Sparkles, Settings } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useMyRoles();
  const { data: profile } = useQuery({
    queryKey: ["profile", me?.userId],
    queryFn: async () => {
      if (!me?.userId) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", me.userId).single();
      return data;
    },
    enabled: !!me?.userId,
  });
  const { data: committees } = useQuery({
    queryKey: ["my_committees", me?.userId],
    queryFn: async () => {
      if (!me?.userId) return [];
      // Delegate committees via portfolios
      const { data: ports } = await supabase
        .from("portfolios")
        .select("id, name, committee_id, committees(id, name, short_name, agenda)")
        .eq("delegate_user_id", me.userId);
      // EB committees
      const { data: eb } = await supabase
        .from("committee_eb")
        .select("committee_id, role_title, committees(id, name, short_name, agenda)")
        .eq("user_id", me.userId);
      const seen = new Set<string>();
      const out: Array<{
        committee_id: string;
        name: string;
        short_name: string | null;
        agenda: string | null;
        role: "delegate" | "eb";
        portfolio?: string;
      }> = [];
      (ports ?? []).forEach((p: any) => {
        if (seen.has(p.committee_id)) return;
        seen.add(p.committee_id);
        out.push({
          committee_id: p.committee_id,
          name: p.committees.name,
          short_name: p.committees.short_name,
          agenda: p.committees.agenda,
          role: "delegate",
          portfolio: p.name,
        });
      });
      (eb ?? []).forEach((p: any) => {
        if (seen.has(p.committee_id)) return;
        seen.add(p.committee_id);
        out.push({
          committee_id: p.committee_id,
          name: p.committees.name,
          short_name: p.committees.short_name,
          agenda: p.committees.agenda,
          role: "eb",
        });
      });
      return out;
    },
    enabled: !!me?.userId,
  });

  const isSuper = me?.roles.includes("super_admin");

  return (
    <DashboardShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="divider-rule">Dashboard</div>
          <h1 className="mt-3 font-display text-4xl">
            Welcome, {profile?.display_name ?? me?.email}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {me?.roles.map((r) => <RoleBadge key={r} role={r} />)}
            {!me?.roles.length && <RoleBadge role="delegate" />}
          </div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Your committees</h2>
        {!committees?.length ? (
          <div className="mt-4 rounded-sm border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            You haven't been assigned to any committee yet. Once the secretariat assigns you a
            portfolio, it will appear here.
            {isSuper && (
              <div className="mt-4">
                <Link to="/admin/users" className="font-medium text-primary underline">
                  Manage assignments →
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {committees.map((c) => (
              <Link
                key={c.committee_id}
                to="/committee/$committeeId"
                params={{ committeeId: c.committee_id }}
                className="group rounded-sm border border-border bg-card p-6 transition-all hover:border-primary hover:shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {c.short_name} · {c.role === "eb" ? "Executive Board" : `Portfolio: ${c.portfolio}`}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
                <h3 className="mt-2 font-display text-2xl font-semibold">{c.name}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{c.agenda}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        <FeatureCard
          icon={<MessagesSquare className="h-5 w-5" />}
          title="Chits"
          body="Send POI, POO, POE, POP, Substantive or Reply chits to the EB or another portfolio."
        />
        <FeatureCard
          icon={<Sparkles className="h-5 w-5" />}
          title="AI-assisted scoring"
          body="Every chit gets an AI recommendation against your committee's criteria; only the EB finalizes."
        />
        <FeatureCard
          icon={<Settings className="h-5 w-5" />}
          title="Visibility controls"
          body="EBs decide whether delegates see totals, breakdowns, or nothing at all."
        />
      </section>
    </DashboardShell>
  );
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-sm border border-border bg-card p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-forest text-ivory">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
