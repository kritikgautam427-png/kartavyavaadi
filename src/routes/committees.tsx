import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PublicLayout, PageHero } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/committees")({
  head: () => ({
    meta: [
      { title: "Committees — Kartavyavaadi Youth Summit 6.0" },
      { name: "description", content: "UNHRC and Lok Sabha 2026 — the two committees of KYS 6.0." },
      { property: "og:title", content: "Committees — KYS 6.0" },
      { property: "og:description", content: "Choose your floor: UNHRC offline or Lok Sabha online." },
    ],
  }),
  component: Committees,
});

function Committees() {
  const { data: committees } = useQuery({
    queryKey: ["public_committees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("committees")
        .select("id, name, short_name, agenda, mode, fee_inr, description")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
  return (
    <PublicLayout>
      <PageHero
        eyebrow="Committees"
        title="Two floors. Two agendas. One unforgettable summit."
        subtitle="Pick the room that pushes your edge — high-stakes diplomacy at UNHRC, or parliamentary fire at Lok Sabha 2026."
      />
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-8 md:grid-cols-2">
          {committees?.map((c) => (
            <div
              key={c.id}
              className="overflow-hidden rounded-sm border border-border bg-card transition-all hover:shadow-xl"
            >
              <div className="bg-forest-gradient p-8 text-ivory">
                <div className="text-[11px] uppercase tracking-[0.22em] text-ivory/70">
                  {c.mode === "OFFLINE" ? "Offline · BVICAM" : "Online"}
                </div>
                <h3 className="mt-3 font-display text-3xl font-semibold leading-tight">
                  {c.name}
                </h3>
              </div>
              <div className="p-8">
                <p className="text-sm leading-relaxed text-muted-foreground">{c.agenda}</p>
                <p className="mt-4 text-sm text-foreground/75">{c.description}</p>
                <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Registration
                    </div>
                    <div className="mt-1 font-display text-3xl text-primary">
                      ₹{c.fee_inr?.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <Link
                    to="/register"
                    className="rounded-sm bg-primary px-5 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:opacity-90"
                  >
                    Register
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
