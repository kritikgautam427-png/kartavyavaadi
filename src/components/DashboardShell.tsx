import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/logo.asset.json";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

export function useMyRoles() {
  return useQuery({
    queryKey: ["my_roles"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { roles: [] as string[], userId: null as string | null, email: null };
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      return {
        roles: (data ?? []).map((r) => r.role),
        userId: u.user.id,
        email: u.user.email ?? null,
      };
    },
  });
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useMyRoles();
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);
  const isSuper = data?.roles.includes("super_admin");
  const isEB = data?.roles.includes("executive_board") || isSuper;

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="flex items-center gap-3">
            <img src={logoAsset.url} alt="" className="h-9 w-9 rounded" />
            <div className="leading-tight">
              <div className="font-display text-lg font-semibold">Kartavyavaadi</div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                Delegate portal
              </div>
            </div>
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <Link to="/dashboard" className="text-foreground/70 hover:text-foreground" activeProps={{className:"text-foreground font-medium"}}>
              Overview
            </Link>
            {isEB && (
              <Link to="/eb/assistant" className="text-foreground/70 hover:text-foreground" activeProps={{className:"text-foreground font-medium"}}>
                EB Assistant
              </Link>
            )}
            {isSuper && (
              <>
                <Link to="/admin/cms" className="text-foreground/70 hover:text-foreground" activeProps={{className:"text-foreground font-medium"}}>
                  CMS
                </Link>
                <Link to="/admin/users" className="text-foreground/70 hover:text-foreground" activeProps={{className:"text-foreground font-medium"}}>
                  Users
                </Link>
              </>
            )}
            <Link to="/" className="text-foreground/50 hover:text-foreground">
              ↗ Public site
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground md:inline">{email}</span>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1 rounded-sm border border-border px-3 py-2 text-xs hover:bg-secondary"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
    </div>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const label = role === "super_admin" ? "Super Admin" : role === "executive_board" ? "Executive Board" : "Delegate";
  return (
    <span className="inline-flex items-center rounded-sm bg-forest px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ivory">
      {label}
    </span>
  );
}
