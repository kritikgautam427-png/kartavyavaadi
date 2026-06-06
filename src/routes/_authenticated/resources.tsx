import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell } from "@/components/DashboardShell";
import { BookOpen, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/resources")({ component: Page });

function Page() {
  const { data: rows } = useQuery({
    queryKey: ["resources_all"],
    queryFn: async () => (await supabase.from("resources").select("*, committees(name)").order("created_at", { ascending: false })).data ?? [],
  });

  const groups: Record<string, any[]> = {};
  (rows ?? []).forEach((r) => {
    groups[r.category] = groups[r.category] ?? [];
    groups[r.category].push(r);
  });

  const labels: Record<string, string> = { "study-guide": "Study guides", rop: "Rules of procedure", template: "Templates", general: "General" };

  return (
    <DashboardShell>
      <div className="divider-rule">Library</div>
      <h1 className="mt-3 font-display text-4xl">Resources</h1>
      <p className="mt-2 text-sm text-muted-foreground">Everything the secretariat has published for your prep.</p>

      {Object.keys(groups).length === 0 && (
        <div className="mt-10 rounded-sm border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No resources yet.</div>
      )}

      {Object.entries(groups).map(([cat, items]) => (
        <section key={cat} className="mt-10">
          <h2 className="font-display text-2xl">{labels[cat] ?? cat}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {items.map((r: any) => (
              <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="group flex items-start gap-3 rounded-sm border border-border bg-card p-5 hover:border-forest">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-forest/10 text-forest"><BookOpen className="h-5 w-5" /></div>
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.committees?.name ?? "All delegates"}</div>
                  <div className="flex items-center gap-2 font-display text-xl">{r.title} <ExternalLink className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" /></div>
                  {r.description && <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>}
                </div>
              </a>
            ))}
          </div>
        </section>
      ))}
    </DashboardShell>
  );
}
