import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { adminLogin } from "@/lib/committees.functions";
import { toast } from "sonner";
import { ShieldCheck, Lock } from "lucide-react";
import logoAsset from "@/assets/logo.asset.json";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin Login — Kartavyavaadi" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const ensureAdmin = useServerFn(adminLogin);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { email, password: pw } = await ensureAdmin({ data: { username, password } });
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) throw error;
      toast.success("Welcome back, Admin.");
      navigate({ to: "/admin/cms" });
    } catch (e: any) {
      toast.error(e?.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-forest-gradient flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-sm border border-ivory/10 bg-background/95 p-10 shadow-2xl backdrop-blur">
        <div className="flex flex-col items-center text-center">
          <img src={logoAsset.url} alt="" className="h-14 w-14 rounded" />
          <div className="mt-4 inline-flex items-center gap-2 rounded-sm bg-forest/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-forest">
            <ShieldCheck className="h-3.5 w-3.5" /> Secretariat
          </div>
          <h1 className="mt-3 font-display text-3xl">Administrator access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Founder console. Authorized personnel only.
          </p>
        </div>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Username
            </label>
            <input
              autoFocus
              autoComplete="username"
              required
              placeholder="vansh_kys_founder"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-2 w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm"
            />
          </div>
          <button
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-forest py-3 text-sm font-semibold uppercase tracking-wider text-ivory hover:opacity-90 disabled:opacity-50"
          >
            <Lock className="h-4 w-4" /> {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          Kartavyavaadi Secretariat · Internal
        </p>
      </div>
    </div>
  );
}
