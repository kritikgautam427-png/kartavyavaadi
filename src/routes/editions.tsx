import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout, PageHero } from "@/components/Layout";
import { useSiteContent } from "@/lib/useSiteContent";

export const Route = createFileRoute("/editions")({
  head: () => ({
    meta: [
      { title: "Past Editions — Kartavyavaadi Group" },
      { name: "description", content: "Six editions of the Kartavyavaadi Youth Summit." },
      { property: "og:title", content: "Past Editions — Kartavyavaadi" },
      { property: "og:description", content: "From Youth Summit 2.0 to the upcoming 6.0." },
    ],
  }),
  component: Editions,
});

function Editions() {
  const { data } = useSiteContent();
  const items = data?.map.editions?.items ?? [];
  return (
    <PublicLayout>
      <PageHero eyebrow="Our Journey" title="Six editions, one philosophy." />
      <section className="mx-auto max-w-4xl px-6 py-20">
        <ol className="relative space-y-10 border-l border-border pl-8">
          {items.map((e: any, idx: number) => (
            <li key={idx} className="relative">
              <span className="absolute -left-[37px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-primary bg-background" />
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {e.date}
              </div>
              <h3 className="mt-2 font-display text-2xl font-semibold">{e.name}</h3>
              <p className="mt-2 text-muted-foreground">{e.desc}</p>
            </li>
          ))}
        </ol>
      </section>
    </PublicLayout>
  );
}
