import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout } from "@/components/Layout";
import { useSiteContent } from "@/lib/useSiteContent";
import logoAsset from "@/assets/logo.asset.json";
import {
  Trophy,
  FileText,
  Film,
  Gavel,
  BookOpen,
  Briefcase,
  Pizza,
  Medal,
  Globe,
  ArrowRight,
} from "lucide-react";

const ICONS: Record<string, any> = {
  trophy: Trophy,
  "file-text": FileText,
  film: Film,
  gavel: Gavel,
  "book-open": BookOpen,
  briefcase: Briefcase,
  pizza: Pizza,
  medal: Medal,
  globe: Globe,
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kartavyavaadi Youth Summit 6.0 — Debate. Diplomacy. Leadership." },
      {
        name: "description",
        content:
          "India's most ambitious Model UN. 20 June 2026 at BVICAM, New Delhi. UNHRC & Lok Sabha 2026, ₹50K+ prize pool.",
      },
      { property: "og:title", content: "Kartavyavaadi Youth Summit 6.0" },
      {
        property: "og:description",
        content:
          "Debate. Diplomacy. Leadership. 20 June 2026 at BVICAM, New Delhi. Register now.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { data } = useSiteContent();
  const hero = data?.map.hero ?? {};
  const stats = data?.map.stats?.items ?? [];
  const perks = data?.map.perks ?? { intro: "", items: [] };
  return (
    <PublicLayout>
      {/* HERO */}
      <section className="relative overflow-hidden bg-forest-gradient text-ivory">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-24 md:grid-cols-[1.3fr_1fr] md:py-32">
          <div>
            <div className="divider-rule text-ivory/70">
              {hero.eyebrow || "Kartavyavaadi Group Presents"}
            </div>
            <h1 className="mt-6 font-display text-5xl font-medium leading-[1.02] md:text-7xl">
              {hero.title || "Kartavyavaadi Youth Summit 6.0"}
            </h1>
            <p className="mt-6 max-w-xl font-display text-2xl italic text-gold md:text-3xl">
              {hero.tagline || "Debate. Diplomacy. Leadership."}
            </p>
            <p className="mt-6 max-w-xl text-base text-ivory/75">
              <span className="font-medium text-ivory">{hero.date}</span> ·{" "}
              {hero.venue}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-sm bg-gold px-6 py-3 text-sm font-semibold uppercase tracking-wider text-foreground transition-transform hover:-translate-y-0.5"
              >
                {hero.ctaPrimary || "Register"} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/committees"
                className="inline-flex items-center gap-2 rounded-sm border border-ivory/40 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-ivory hover:bg-ivory/10"
              >
                {hero.ctaSecondary || "View Committees"}
              </Link>
            </div>
          </div>
          <div className="hidden justify-center md:flex">
            <div className="relative">
              <div className="absolute -inset-8 rounded-full bg-gold/10 blur-3xl" />
              <img
                src={logoAsset.url}
                alt="Kartavyavaadi"
                className="relative h-72 w-72 rounded-2xl border border-ivory/10 shadow-2xl"
              />
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="border-t border-ivory/10">
          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-ivory/10 px-6 md:grid-cols-4">
            {stats.map((s: any) => (
              <div key={s.label} className="px-4 py-8 text-center md:py-10">
                <div className="font-display text-4xl text-gold md:text-5xl">{s.value}</div>
                <div className="mt-2 text-[11px] uppercase tracking-[0.2em] text-ivory/60">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PERKS */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="divider-rule">Why Attend</div>
        <h2 className="mt-4 max-w-3xl font-display text-4xl md:text-5xl">
          Perks of participation
        </h2>
        <p className="mt-4 max-w-2xl text-muted-foreground">{perks.intro}</p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {perks.items?.map((p: any) => {
            const Icon = ICONS[p.icon] ?? Trophy;
            return (
              <div
                key={p.title}
                className="group rounded-sm border border-border bg-card p-6 transition-colors hover:border-primary"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-forest text-ivory">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* COMMITTEES PEEK */}
      <section className="bg-secondary/50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="divider-rule">Committees</div>
              <h2 className="mt-3 font-display text-4xl md:text-5xl">Choose your floor</h2>
            </div>
            <Link
              to="/committees"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all committees →
            </Link>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <CommitteeCard
              tag="Committee 1 — Offline"
              name="United Nations Human Rights Council"
              agenda="Addressing International Human Trafficking — with special emphasis on the Jeffrey Epstein Case."
              price="₹2,500"
            />
            <CommitteeCard
              tag="Committee 2 — Online"
              name="Lok Sabha 2026"
              agenda="Reforming the Indian Education System — with special emphasis on the NEET Controversy."
              price="₹500"
            />
          </div>
        </div>
      </section>

      {/* FOUNDER QUOTE */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <div className="divider-rule justify-center">From the Desk of</div>
        <blockquote className="mt-8 font-display text-3xl leading-snug md:text-4xl">
          “True change is not born merely from ideas, but from the courage to act upon them.”
        </blockquote>
        <div className="mt-8 text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Vansh Wadhawan · Founder President
        </div>
      </section>
    </PublicLayout>
  );
}

function CommitteeCard({
  tag,
  name,
  agenda,
  price,
}: {
  tag: string;
  name: string;
  agenda: string;
  price: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-sm border border-border bg-card p-8 transition-all hover:border-primary hover:shadow-lg">
      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{tag}</div>
      <h3 className="mt-3 font-display text-3xl font-semibold leading-tight">{name}</h3>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{agenda}</p>
      <div className="mt-8 flex items-center justify-between">
        <div className="font-display text-2xl text-primary">{price}</div>
        <Link
          to="/register"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          Register <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
