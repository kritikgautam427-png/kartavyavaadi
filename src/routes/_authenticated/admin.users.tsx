import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, useMyRoles } from "@/components/DashboardShell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const { data: me } = useMyRoles();
  const qc = useQueryClient();
  const isSuper = me?.roles.includes("super_admin");

  const { data: profiles } = useQuery({
    queryKey: ["all_profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, display_name, email").order("created_at");
      return data ?? [];
    },
    enabled: !!isSuper,
  });

  const { data: roles } = useQuery({
    queryKey: ["all_roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id, role");
      return data ?? [];
    },
    enabled: !!isSuper,
  });

  const { data: committees } = useQuery({
    queryKey: ["all_committees"],
    queryFn: async () => {
      const { data } = await supabase.from("committees").select("id, name, short_name").order("created_at");
      return data ?? [];
    },
    enabled: !!isSuper,
  });

  const { data: portfolios } = useQuery({
    queryKey: ["all_portfolios"],
    queryFn: async () => {
      const { data } = await supabase
        .from("portfolios")
        .select("id, name, committee_id, delegate_user_id")
        .order("name");
      return data ?? [];
    },
    enabled: !!isSuper,
  });

  const { data: ebMembership } = useQuery({
    queryKey: ["all_eb"],
    queryFn: async () => {
      const { data } = await supabase.from("committee_eb").select("user_id, committee_id, role_title");
      return data ?? [];
    },
    enabled: !!isSuper,
  });

  if (!isSuper) {
    return (
      <DashboardShell>
        <div className="rounded-sm border border-border bg-card p-10 text-center">
          <h1 className="font-display text-3xl">User Management</h1>
          <p className="mt-2 text-muted-foreground">Super Admin access only.</p>
        </div>
      </DashboardShell>
    );
  }

  const rolesByUser: Record<string, string[]> = {};
  (roles ?? []).forEach((r) => {
    rolesByUser[r.user_id] = rolesByUser[r.user_id] ?? [];
    rolesByUser[r.user_id].push(r.role);
  });

  const toggleRole = async (userId: string, role: "super_admin" | "executive_board") => {
    const has = rolesByUser[userId]?.includes(role);
    if (has) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role });
    }
    toast.success("Role updated");
    qc.invalidateQueries({ queryKey: ["all_roles"] });
  };

  const assignPortfolio = async (portfolioId: string, userId: string | null) => {
    await supabase.from("portfolios").update({ delegate_user_id: userId }).eq("id", portfolioId);
    toast.success("Portfolio updated");
    qc.invalidateQueries({ queryKey: ["all_portfolios"] });
  };

  const assignEB = async (committeeId: string, userId: string, on: boolean) => {
    if (on) {
      await supabase.from("committee_eb").insert({ committee_id: committeeId, user_id: userId });
    } else {
      await supabase.from("committee_eb").delete().eq("committee_id", committeeId).eq("user_id", userId);
    }
    qc.invalidateQueries({ queryKey: ["all_eb"] });
    toast.success("EB membership updated");
  };

  return (
    <DashboardShell>
      <div className="divider-rule">Super Admin</div>
      <h1 className="mt-3 font-display text-4xl">Users, roles & assignments</h1>

      <section className="mt-10">
        <h2 className="font-display text-2xl">All users</h2>
        <div className="mt-4 overflow-hidden rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3">EB on committee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {profiles?.map((p) => {
                const r = rolesByUser[p.id] ?? [];
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.display_name}</div>
                      <div className="text-xs text-muted-foreground">{p.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <label className="mr-3 inline-flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={r.includes("super_admin")}
                          onChange={() => toggleRole(p.id, "super_admin")}
                        />
                        Super Admin
                      </label>
                      <label className="inline-flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={r.includes("executive_board")}
                          onChange={() => toggleRole(p.id, "executive_board")}
                        />
                        Executive Board
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {committees?.map((c) => {
                          const on = ebMembership?.some(
                            (e) => e.user_id === p.id && e.committee_id === c.id,
                          );
                          return (
                            <button
                              key={c.id}
                              onClick={() => assignEB(c.id, p.id, !on)}
                              className={`rounded-sm border px-2 py-1 text-[10px] uppercase tracking-wider ${
                                on
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border hover:bg-secondary"
                              }`}
                            >
                              {c.short_name}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl">Portfolio assignments</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Link each delegate to a portfolio so they can submit chits.
        </p>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {committees?.map((c) => (
            <div key={c.id} className="rounded-sm border border-border bg-card p-5">
              <div className="font-display text-xl">{c.name}</div>
              <ul className="mt-3 space-y-2 text-sm">
                {portfolios
                  ?.filter((p) => p.committee_id === c.id)
                  .map((p) => (
                    <li key={p.id} className="flex items-center gap-2">
                      <span className="flex-1">{p.name}</span>
                      <select
                        value={p.delegate_user_id ?? ""}
                        onChange={(e) => assignPortfolio(p.id, e.target.value || null)}
                        className="rounded-sm border border-input bg-background px-2 py-1 text-xs"
                      >
                        <option value="">— Unassigned —</option>
                        {profiles?.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.display_name} ({u.email})
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
