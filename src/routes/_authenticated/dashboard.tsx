import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, RoleBadge, useMyRoles } from "@/components/DashboardShell";
import { ArrowRight, MessagesSquare, Sparkles, Settings, KeyRound, LogIn, Megaphone, BookOpen, TrendingUp } from "lucide-react";
import { useState } from "react";
import { joinByCode } from "@/lib/committees.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useMyRoles();
  const qc = useQueryClient();
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
      const { data: ports } = await supabase
        .from("portfolios")
        .select("id, name, committee_id, committees(id, name, short_name, agenda)")
        .eq("delegate_user_id", me.userId);
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

      <JoinCommitteeCard
        onJoined={() => qc.invalidateQueries({ queryKey: ["my_committees"] })}
      />

      <section className="mt-12">
        <h2 className="font-display text-2xl">Your committees</h2>
        {!committees?.length ? (
          <div className="mt-4 rounded-sm border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            You haven't joined any committee yet. Use the join code from your secretariat above.
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

function JoinCommitteeCard({ onJoined }: { onJoined: () => void }) {
  const join = useServerFn(joinByCode);
  const [code, setCode] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !portfolio.trim()) return;
    setBusy(true);
    try {
      const r = await join({ data: { code: code.trim().toUpperCase(), portfolio_name: portfolio.trim() } });
      toast.success(r.already ? "You're already in this committee." : `Joined as ${r.portfolio}`);
      setCode("");
      setPortfolio("");
      onJoined();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not join");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-10 overflow-hidden rounded-sm border border-border bg-card">
      <div className="grid gap-0 md:grid-cols-[1fr_1.4fr]">
        <div className="bg-forest-gradient p-8 text-ivory">
          <div className="inline-flex items-center gap-2 rounded-sm bg-ivory/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]">
            <KeyRound className="h-3 w-3" /> Join code
          </div>
          <h2 className="mt-4 font-display text-3xl leading-tight">
            Join a committee room
          </h2>
          <p className="mt-3 text-sm text-ivory/75">
            Got a code from the Secretariat? Enter it with your portfolio (country, ministry,
            constituency) to be admitted into the room.
          </p>
        </div>
        <form onSubmit={submit} className="grid gap-4 p-8 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Join code
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. K7M3PQ"
              maxLength={16}
              className="mt-2 w-full rounded-sm border border-input bg-background px-3 py-2.5 font-mono text-sm tracking-widest"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Portfolio
            </label>
            <input
              value={portfolio}
              onChange={(e) => setPortfolio(e.target.value)}
              placeholder="e.g. Republic of France"
              maxLength={120}
              className="mt-2 w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              disabled={busy || !code || !portfolio}
              className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-primary py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" /> {busy ? "Joining…" : "Enter committee"}
            </button>
          </div>
        </form>
      </div>
    </section>
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
