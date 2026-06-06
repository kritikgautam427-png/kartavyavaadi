import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, useMyRoles } from "@/components/DashboardShell";
import { saveAnnouncement, deleteAnnouncement } from "@/lib/admin.functions";
import { Field, PageHeader, Denied } from "./admin.conferences";
import { toast } from "sonner";
import { useState } from "react";
import { Megaphone, Trash2, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/announcements")({ component: Page });

function Page() {
  const { data: me } = useMyRoles();
  const qc = useQueryClient();
  const isSuper = me?.roles.includes("super_admin");
  const save = useServerFn(saveAnnouncement);
  const del = useServerFn(deleteAnnouncement);
  const [draft, setDraft] = useState<any>({ title: "", body: "", scope: "global", committee_id: null });

  const { data: rows } = useQuery({
    queryKey: ["all_announcements"],
    queryFn: async () => {
      const { data } = await supabase.from("announcements").select("*, committees(name)").order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!isSuper,
  });
  const { data: committees } = useQuery({
    queryKey: ["committees_min"],
    enabled: !!isSuper,
    queryFn: async () => (await supabase.from("committees").select("id, name")).data ?? [],
  });

  if (!isSuper) return <DashboardShell><Denied /></DashboardShell>;

  const onPost = async () => {
    if (!draft.title.trim() || !draft.body.trim()) return;
    try {
      await save({ data: { ...draft, committee_id: draft.scope === "committee" ? draft.committee_id : null } });
      toast.success("Broadcast sent");
      setDraft({ title: "", body: "", scope: "global", committee_id: null });
      qc.invalidateQueries({ queryKey: ["all_announcements"] });
      qc.invalidateQueries({ queryKey: ["delegate_announcements"] });
    } catch (e: any) { toast.error(e.message); }
  };
  const onDelete = async (id: string) => {
    if (!confirm("Delete?")) return;
    await del({ data: { id } });
    qc.invalidateQueries({ queryKey: ["all_announcements"] });
  };

  const inp = "mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm";

  return (
    <DashboardShell>
      <PageHeader title="Announcements" subtitle="Broadcast to all delegates or a specific committee." />
      <div className="mt-6 rounded-sm border-2 border-forest/40 bg-card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Title" full><input className={inp} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
          <Field label="Scope">
            <select className={inp} value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value })}>
              <option value="global">All delegates</option>
              <option value="committee">Specific committee</option>
            </select>
          </Field>
          {draft.scope === "committee" && (
            <Field label="Committee">
              <select className={inp} value={draft.committee_id ?? ""} onChange={(e) => setDraft({ ...draft, committee_id: e.target.value })}>
                <option value="">— select —</option>
                {committees?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Message" full><textarea rows={4} className={inp} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} /></Field>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={onPost} className="inline-flex items-center gap-2 rounded-sm bg-forest px-4 py-2 text-sm font-semibold uppercase tracking-wider text-ivory hover:opacity-90"><Megaphone className="h-4 w-4" /> Broadcast</button>
        </div>
      </div>
      <div className="mt-8 grid gap-3">
        {rows?.map((r: any) => (
          <div key={r.id} className="rounded-sm border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {r.scope === "global" ? "All delegates" : r.committees?.name ?? "Committee"} · {new Date(r.created_at).toLocaleString()}
                </div>
                <h3 className="font-display text-xl">{r.title}</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm">{r.body}</p>
              </div>
              <button onClick={() => onDelete(r.id)} className="rounded-sm border border-destructive/30 p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
