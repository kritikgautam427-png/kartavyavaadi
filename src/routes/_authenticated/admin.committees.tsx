import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, useMyRoles } from "@/components/DashboardShell";
import { saveCommittee, deleteCommittee } from "@/lib/admin.functions";
import { Field, PageHeader, Denied } from "./admin.conferences";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Trash2, Save, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/committees")({
  component: Page,
});

function Page() {
  const { data: me } = useMyRoles();
  const qc = useQueryClient();
  const isSuper = me?.roles.includes("super_admin");
  const save = useServerFn(saveCommittee);
  const del = useServerFn(deleteCommittee);
  const [draft, setDraft] = useState<any>(null);

  const { data: rows } = useQuery({
    queryKey: ["all_committees_full"],
    enabled: !!isSuper,
    queryFn: async () => {
      const { data } = await supabase.from("committees").select("*, conferences(name)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const { data: conferences } = useQuery({
    queryKey: ["all_conferences_min"],
    enabled: !!isSuper,
    queryFn: async () => {
      const { data } = await supabase.from("conferences").select("id, name");
      return data ?? [];
    },
  });

  if (!isSuper) return <DashboardShell><Denied /></DashboardShell>;

  const onSave = async (row: any) => {
    try { await save({ data: row }); toast.success("Saved"); setDraft(null); qc.invalidateQueries({ queryKey: ["all_committees_full"] }); }
    catch (e: any) { toast.error(e.message); }
  };
  const onDelete = async (id: string) => {
    if (!confirm("Delete this committee? Portfolios will be removed too.")) return;
    try { await del({ data: { id } }); toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["all_committees_full"] }); }
    catch (e: any) { toast.error(e.message); }
  };

  const inp = "mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm";

  return (
    <DashboardShell>
      <PageHeader title="Committees" subtitle="Configure rooms, agendas, and entry fees." />
      <div className="mt-6 flex justify-end">
        <button onClick={() => setDraft({ name: "", short_name: "", agenda: "", description: "", mode: "in-person", fee_inr: 0, conference_id: conferences?.[0]?.id ?? null })}
          className="inline-flex items-center gap-2 rounded-sm bg-forest px-4 py-2 text-sm font-semibold uppercase tracking-wider text-ivory hover:opacity-90">
          <Plus className="h-4 w-4" /> New committee
        </button>
      </div>
      {draft && (
        <div className="mt-6 rounded-sm border-2 border-forest/40 bg-card p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name"><input className={inp} value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <Field label="Short name"><input className={inp} value={draft.short_name ?? ""} onChange={(e) => setDraft({ ...draft, short_name: e.target.value })} /></Field>
            <Field label="Conference">
              <select className={inp} value={draft.conference_id ?? ""} onChange={(e) => setDraft({ ...draft, conference_id: e.target.value || null })}>
                <option value="">— none —</option>
                {conferences?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Mode"><input className={inp} value={draft.mode ?? ""} onChange={(e) => setDraft({ ...draft, mode: e.target.value })} /></Field>
            <Field label="Fee (INR)"><input type="number" className={inp} value={draft.fee_inr ?? 0} onChange={(e) => setDraft({ ...draft, fee_inr: Number(e.target.value) })} /></Field>
            <Field label="Agenda" full><input className={inp} value={draft.agenda ?? ""} onChange={(e) => setDraft({ ...draft, agenda: e.target.value })} /></Field>
            <Field label="Description" full><textarea className={inp} rows={3} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setDraft(null)} className="rounded-sm border border-border px-4 py-2 text-sm">Cancel</button>
            <button onClick={() => onSave(draft)} className="inline-flex items-center gap-2 rounded-sm bg-forest px-4 py-2 text-sm font-semibold uppercase tracking-wider text-ivory hover:opacity-90"><Save className="h-4 w-4" /> Save</button>
          </div>
        </div>
      )}
      <div className="mt-6 grid gap-3">
        {rows?.map((c: any) => (
          <div key={c.id} className="rounded-sm border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.short_name} · {c.conferences?.name ?? "no conference"} · ₹{c.fee_inr ?? 0}</div>
                <h3 className="font-display text-2xl">{c.name}</h3>
                <p className="mt-1 text-sm italic text-muted-foreground">{c.agenda}</p>
              </div>
              <div className="flex gap-2">
                <Link to="/committee/$committeeId" params={{ committeeId: c.id }} className="inline-flex items-center gap-1 rounded-sm border border-border px-3 py-1.5 text-xs hover:bg-secondary"><ExternalLink className="h-3.5 w-3.5" /> Open</Link>
                <button onClick={() => setDraft({ ...c, conferences: undefined })} className="rounded-sm border border-border px-3 py-1.5 text-xs hover:bg-secondary">Edit</button>
                <button onClick={() => onDelete(c.id)} className="rounded-sm border border-destructive/30 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
