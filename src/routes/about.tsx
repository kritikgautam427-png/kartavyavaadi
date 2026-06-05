import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout, PageHero } from "@/components/Layout";
import { useSiteContent } from "@/lib/useSiteContent";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Kartavyavaadi Group" },
      {
        name: "description",
        content:
          "Kartavyavaadi Group cultivates responsibility-driven leadership through India's most competitive Model UN circuit.",
      },
      { property: "og:title", content: "About — Kartavyavaadi Group" },
      { property: "og:description", content: "Responsibility-driven leadership, six editions strong." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { data } = useSiteContent();
  const fm = data?.map.founder_message ?? {};
  const venue = data?.map.venue ?? {};
  return (
    <PublicLayout>
      <PageHero
        eyebrow="About"
        title="A community of debaters, diplomats and dissenters."
        subtitle="Six editions in, the Kartavyavaadi Group has built one of the sharpest Model UN circuits in the country — equal parts rigour and warmth."
      />
      <section className="mx-auto max-w-4xl px-6 py-24">
        <div className="divider-rule">Message from the Founder</div>
        <h2 className="mt-4 font-display text-4xl md:text-5xl">{fm.name}</h2>
        <div className="mt-2 text-sm uppercase tracking-[0.18em] text-muted-foreground">
          {fm.title}
        </div>
        <div className="mt-10 space-y-5 font-display text-xl leading-relaxed text-foreground/85">
          {(fm.message || "").split("\n\n").map((p: string, i: number) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="mt-10 text-sm text-muted-foreground">
          {fm.phone} · {fm.email}
        </div>
      </section>

      <section className="bg-secondary/50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="divider-rule">Venue</div>
          <h2 className="mt-4 font-display text-4xl md:text-5xl">{venue.name}</h2>
          <p className="mt-4 text-muted-foreground">{venue.short}</p>
          <p className="mt-2 text-sm text-muted-foreground">Nearest metro: {venue.metro}</p>
          <p className="mt-8 max-w-3xl leading-relaxed text-foreground/80">{venue.description}</p>
        </div>
      </section>
    </PublicLayout>
  );
}
