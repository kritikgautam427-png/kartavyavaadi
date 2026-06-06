import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, useMyRoles } from "@/components/DashboardShell";
import { saveResource, deleteResource } from "@/lib/admin.functions";
import { Field, PageHeader, Denied } from "./admin.conferences";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Trash2, Save, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/resources")({ component: Page });

function Page() {
  const { data: me } = useMyRoles();
  const qc = useQueryClient();
  const isSuper = me?.roles.includes("super_admin");
  const save = useServerFn(saveResource);
  const del = useServerFn(deleteResource);
  const [draft, setDraft] = useState<any>(null);

  const { data: rows } = useQuery({
    queryKey: ["all_resources"],
    queryFn: async () => (await supabase.from("resources").select("*, committees(name)").order("created_at", { ascending: false })).data ?? [],
    enabled: !!isSuper,
  });
  const { data: committees } = useQuery({
    queryKey: ["committees_min"],
    enabled: !!isSuper,
    queryFn: async () => (await supabase.from("committees").select("id, name")).data ?? [],
  });

  if (!isSuper) return <DashboardShell><Denied /></DashboardShell>;
  const inp = "mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm";

  const onSave = async () => {
    try {
      await save({ data: draft });
      toast.success("Saved");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["all_resources"] });
    } catch (e: any) { toast.error(e.message); }
  };
  const onDelete = async (id: string) => { if (!confirm("Delete?")) return; await del({ data: { id } }); qc.invalidateQueries({ queryKey: ["all_resources"] }); };

  return (
    <DashboardShell>
      <PageHeader title="Resource library" subtitle="Study guides, RoPs, position-paper templates." />
      <div className="mt-6 flex justify-end">
        <button onClick={() => setDraft({ title: "", description: "", url: "", category: "study-guide", committee_id: null })} className="inline-flex items-center gap-2 rounded-sm bg-forest px-4 py-2 text-sm font-semibold uppercase tracking-wider text-ivory hover:opacity-90"><Plus className="h-4 w-4" /> New resource</button>
      </div>
      {draft && (
        <div className="mt-6 rounded-sm border-2 border-forest/40 bg-card p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title" full><input className={inp} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
            <Field label="URL" full><input className={inp} value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="https://…" /></Field>
            <Field label="Category">
              <select className={inp} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                <option value="study-guide">Study guide</option>
                <option value="rop">Rules of procedure</option>
                <option value="template">Template</option>
                <option value="general">General</option>
              </select>
            </Field>
            <Field label="Committee (optional)">
              <select className={inp} value={draft.committee_id ?? ""} onChange={(e) => setDraft({ ...draft, committee_id: e.target.value || null })}>
                <option value="">— all delegates —</option>
                {committees?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Description" full><textarea rows={2} className={inp} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setDraft(null)} className="rounded-sm border border-border px-4 py-2 text-sm">Cancel</button>
            <button onClick={onSave} className="inline-flex items-center gap-2 rounded-sm bg-forest px-4 py-2 text-sm font-semibold uppercase tracking-wider text-ivory hover:opacity-90"><Save className="h-4 w-4" /> Save</button>
          </div>
        </div>
      )}
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {rows?.map((r: any) => (
          <div key={r.id} className="rounded-sm border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-forest/10 text-forest"><BookOpen className="h-5 w-5" /></div>
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.category} {r.committees?.name && `· ${r.committees.name}`}</div>
                <a href={r.url} target="_blank" rel="noreferrer" className="block font-display text-xl hover:underline">{r.title}</a>
                {r.description && <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>}
              </div>
              <button onClick={() => onDelete(r.id)} className="rounded-sm border border-destructive/30 p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
