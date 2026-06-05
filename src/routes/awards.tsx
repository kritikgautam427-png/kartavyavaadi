import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout, PageHero } from "@/components/Layout";
import { useSiteContent } from "@/lib/useSiteContent";

export const Route = createFileRoute("/awards")({
  head: () => ({
    meta: [
      { title: "Awards & Prizes — KYS 6.0" },
      { name: "description", content: "₹50,000+ prize pool across UNHRC and Lok Sabha awards." },
      { property: "og:title", content: "Awards & Prizes — KYS 6.0" },
      { property: "og:description", content: "Trophies, LORs, gift hampers and a ₹50,000+ prize pool." },
    ],
  }),
  component: Awards,
});

function Awards() {
  const { data } = useSiteContent();
  const unhrc = data?.map.awards_unhrc ?? { items: [] };
  const ls = data?.map.awards_loksabha ?? { items: [] };
  return (
    <PublicLayout>
      <PageHero
        eyebrow="Awards"
        title="₹50,000+ prize pool. Trophies. LORs. Glory."
        subtitle="Victory should look impressive on a shelf and useful in an application."
      />
      <section className="mx-auto max-w-6xl px-6 py-20">
        <AwardsTable title={unhrc.title || "UNHRC — Awards & Prizes"} items={unhrc.items} />
        <div className="mt-20">
          <AwardsTable title={ls.title || "Lok Sabha — Awards"} items={ls.items} />
        </div>
      </section>
    </PublicLayout>
  );
}

function AwardsTable({ title, items }: { title: string; items: any[] }) {
  return (
    <div>
      <h2 className="font-display text-3xl md:text-4xl">{title}</h2>
      <div className="mt-8 overflow-hidden rounded-sm border border-border">
        <table className="w-full text-sm">
          <thead className="bg-forest-deep text-ivory">
            <tr>
              <th className="px-6 py-4 text-left text-[11px] uppercase tracking-[0.22em] font-medium">
                Award
              </th>
              <th className="px-6 py-4 text-left text-[11px] uppercase tracking-[0.22em] font-medium">
                Cash
              </th>
              <th className="px-6 py-4 text-left text-[11px] uppercase tracking-[0.22em] font-medium">
                Perks
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {items?.map((i: any) => (
              <tr key={i.name} className="hover:bg-secondary/40">
                <td className="px-6 py-4 font-medium">{i.name}</td>
                <td className="px-6 py-4 font-display text-lg text-primary">{i.cash}</td>
                <td className="px-6 py-4 text-muted-foreground">{i.perks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
