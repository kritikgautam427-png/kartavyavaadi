import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout, PageHero } from "@/components/Layout";
import { useSiteContent } from "@/lib/useSiteContent";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — KYS 6.0" },
      { name: "description", content: "Frequently asked questions about the summit." },
      { property: "og:title", content: "FAQ — KYS 6.0" },
      { property: "og:description", content: "Everything you need to know before registering." },
    ],
  }),
  component: FAQ,
});

function FAQ() {
  const { data } = useSiteContent();
  const items = data?.map.faqs?.items ?? [];
  return (
    <PublicLayout>
      <PageHero eyebrow="FAQ" title="Questions, answered." />
      <section className="mx-auto max-w-3xl px-6 py-20">
        <div className="space-y-4">
          {items.map((f: any, i: number) => (
            <details
              key={i}
              className="group rounded-sm border border-border bg-card p-6 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer items-center justify-between font-display text-xl font-semibold">
                {f.q}
                <span className="text-2xl text-primary transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-4 text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
