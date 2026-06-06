import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, useMyRoles } from "@/components/DashboardShell";
import { saveConference, deleteConference } from "@/lib/admin.functions";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/conferences")({
  component: Page,
});

function Page() {
  const { data: me } = useMyRoles();
  const qc = useQueryClient();
  const isSuper = me?.roles.includes("super_admin");
  const save = useServerFn(saveConference);
  const del = useServerFn(deleteConference);
  const [draft, setDraft] = useState<any>(null);

  const { data: rows } = useQuery({
    queryKey: ["all_conferences"],
    enabled: !!isSuper,
    queryFn: async () => {
      const { data } = await supabase.from("conferences").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (!isSuper) return <DashboardShell><Denied /></DashboardShell>;

  const onSave = async (row: any) => {
    try {
      await save({ data: row });
      toast.success("Saved");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["all_conferences"] });
    } catch (e: any) { toast.error(e.message); }
  };
  const onDelete = async (id: string) => {
    if (!confirm("Delete this conference?")) return;
    try { await del({ data: { id } }); toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["all_conferences"] }); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <DashboardShell>
      <PageHeader title="Conferences" subtitle="Create, edit, and archive your conference editions." />
      <div className="mt-6 flex justify-end">
        <button onClick={() => setDraft({ name: "", edition: "", venue: "", description: "", active: true })}
          className="inline-flex items-center gap-2 rounded-sm bg-forest px-4 py-2 text-sm font-semibold uppercase tracking-wider text-ivory hover:opacity-90">
          <Plus className="h-4 w-4" /> New conference
        </button>
      </div>
      {draft && <Editor draft={draft} setDraft={setDraft} onSave={onSave} />}
      <div className="mt-6 grid gap-3">
        {rows?.map((c) => (
          <div key={c.id} className="rounded-sm border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.edition}</div>
                <h3 className="font-display text-2xl">{c.name}</h3>
                <div className="mt-1 text-xs text-muted-foreground">{c.venue} {c.event_date && `· ${c.event_date}`} {c.active ? "· Active" : "· Archived"}</div>
                {c.description && <p className="mt-2 text-sm">{c.description}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDraft({ ...c })} className="rounded-sm border border-border px-3 py-1.5 text-xs hover:bg-secondary">Edit</button>
                <button onClick={() => onDelete(c.id)} className="rounded-sm border border-destructive/30 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}

function Editor({ draft, setDraft, onSave }: any) {
  return (
    <div className="mt-6 rounded-sm border-2 border-forest/40 bg-card p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name"><input className={inp} value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
        <Field label="Edition"><input className={inp} value={draft.edition ?? ""} onChange={(e) => setDraft({ ...draft, edition: e.target.value })} /></Field>
        <Field label="Event date (YYYY-MM-DD)"><input className={inp} value={draft.event_date ?? ""} onChange={(e) => setDraft({ ...draft, event_date: e.target.value || null })} /></Field>
        <Field label="Venue"><input className={inp} value={draft.venue ?? ""} onChange={(e) => setDraft({ ...draft, venue: e.target.value })} /></Field>
        <Field label="Active"><select className={inp} value={String(draft.active ?? true)} onChange={(e) => setDraft({ ...draft, active: e.target.value === "true" })}><option value="true">Yes</option><option value="false">No</option></select></Field>
        <Field label="Description" full><textarea className={inp} rows={3} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={() => setDraft(null)} className="rounded-sm border border-border px-4 py-2 text-sm">Cancel</button>
        <button onClick={() => onSave(draft)} className="inline-flex items-center gap-2 rounded-sm bg-forest px-4 py-2 text-sm font-semibold uppercase tracking-wider text-ivory hover:opacity-90"><Save className="h-4 w-4" /> Save</button>
      </div>
    </div>
  );
}

const inp = "mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm";
export function Field({ label, children, full }: any) {
  return <div className={full ? "md:col-span-2" : ""}><label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>{children}</div>;
}
export function PageHeader({ title, subtitle }: any) {
  return (
    <div>
      <div className="divider-rule">Secretariat</div>
      <h1 className="mt-3 font-display text-4xl">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
export function Denied() {
  return <div className="rounded-sm border border-border bg-card p-10 text-center"><h1 className="font-display text-3xl">Restricted</h1><p className="mt-2 text-muted-foreground">Super Admin access only.</p></div>;
}
