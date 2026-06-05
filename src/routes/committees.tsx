import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PublicLayout, PageHero } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink } from "lucide-react";

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

const LOK_SABHA_FORM =
  "https://docs.google.com/forms/d/e/1FAIpQLSd602-tfgpxExOL-dsbhwy0P4JaexZQryL2cNQf1ifbpQYhQg/viewform";
const UNHRC_FORM =
  "https://docs.google.com/forms/d/e/1FAIpQLSf9HiqaiaY8avR_-AqdC20bKnhSitAb_zYHQzQqbT9X2bSJdw/viewform";

export function getRegistrationUrl(name: string | null | undefined): string | null {
  if (!name) return null;
  const n = name.toLowerCase();
  if (n.includes("lok sabha")) return LOK_SABHA_FORM;
  if (n.includes("unhrc") || n.includes("human rights")) return UNHRC_FORM;
  return null;
}

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
          {committees?.map((c) => {
            const url = getRegistrationUrl(c.name);
            return (
              <div
                key={c.id}
                className="group relative overflow-hidden rounded-sm border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-2xl"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gold opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="bg-forest-gradient p-8 text-ivory">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-ivory/70">
                      {c.mode === "OFFLINE" ? "Offline · BVICAM" : "Online"}
                    </div>
                    <span className="rounded-sm bg-ivory/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-ivory/80">
                      {c.short_name}
                    </span>
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
                    <a
                      href={url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (!url) e.preventDefault();
                      }}
                      className="inline-flex items-center gap-2 rounded-sm bg-primary px-5 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:opacity-90"
                    >
                      Register <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </PublicLayout>
  );
}
