import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { DashboardShell, useMyRoles } from "@/components/DashboardShell";
import { getAllSiteContent, updateSiteContent } from "@/lib/site-content.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/cms")({
  component: CMS,
});

function CMS() {
  const { data: me } = useMyRoles();
  const isSuper = me?.roles.includes("super_admin");
  const fetcher = useServerFn(getAllSiteContent);
  const updater = useServerFn(updateSiteContent);
  const qc = useQueryClient();
  const { data, refetch } = useQuery({
    queryKey: ["cms_rows"],
    queryFn: () => fetcher({}),
    enabled: !!isSuper,
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isSuper) {
    return (
      <DashboardShell>
        <div className="rounded-sm border border-border bg-card p-10 text-center">
          <h1 className="font-display text-3xl">CMS</h1>
          <p className="mt-2 text-muted-foreground">Super Admin access only.</p>
        </div>
      </DashboardShell>
    );
  }

  const rows = data?.rows ?? [];
  const current = rows.find((r: any) => r.key === selected);

  const openRow = (key: string) => {
    const row = rows.find((r: any) => r.key === key);
    if (!row) return;
    setSelected(key);
    setDraft(JSON.stringify(row.value, null, 2));
  };

  const save = async () => {
    if (!selected) return;
    let parsed;
    try {
      parsed = JSON.parse(draft);
    } catch {
      toast.error("Invalid JSON");
      return;
    }
    setBusy(true);
    try {
      await updater({ data: { key: selected, value: parsed } });
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["site_content"] });
      refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const grouped: Record<string, any[]> = {};
  rows.forEach((r: any) => {
    grouped[r.category] = grouped[r.category] ?? [];
    grouped[r.category].push(r);
  });

  return (
    <DashboardShell>
      <div className="divider-rule">Super Admin</div>
      <h1 className="mt-3 font-display text-4xl">Content Management</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Edit every public-facing section of the website without touching code. Changes apply
        instantly across the site.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_2fr]">
        <aside className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {cat}
              </div>
              <ul className="mt-2 space-y-1">
                {items.map((r) => (
                  <li key={r.key}>
                    <button
                      onClick={() => openRow(r.key)}
                      className={`w-full rounded-sm px-3 py-2 text-left text-sm ${
                        selected === r.key
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-secondary"
                      }`}
                    >
                      {r.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>
        <div className="rounded-sm border border-border bg-card p-6">
          {!current ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Select a section to edit.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl">{current.label}</h2>
                <button
                  onClick={save}
                  disabled={busy}
                  className="rounded-sm bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save"}
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Edit as JSON. The shape varies by section — keep the existing keys.
              </p>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={26}
                className="mt-4 w-full rounded-sm border border-input bg-background px-3 py-2 font-mono text-xs"
              />
            </>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
