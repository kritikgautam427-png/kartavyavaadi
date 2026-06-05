import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout, PageHero } from "@/components/Layout";
import { useSiteContent } from "@/lib/useSiteContent";
import { Mail, Phone, User } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Kartavyavaadi Group" },
      { name: "description", content: "Reach the Kartavyavaadi Group team." },
      { property: "og:title", content: "Contact — Kartavyavaadi" },
      { property: "og:description", content: "Founder President: Vansh Wadhawan." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const { data } = useSiteContent();
  const c = data?.map.contact ?? {};
  return (
    <PublicLayout>
      <PageHero eyebrow="Reach out" title="Any queries or concerns?" />
      <section className="mx-auto max-w-3xl px-6 py-20">
        <div className="rounded-sm border border-border bg-card p-10">
          <div className="flex items-center gap-3 text-muted-foreground">
            <User className="h-5 w-5" />
            <div>
              <div className="font-display text-2xl text-foreground">{c.founder}</div>
              <div className="text-sm">{c.title}</div>
            </div>
          </div>
          <div className="mt-8 space-y-4 text-sm">
            <a href={`tel:${c.phone}`} className="flex items-center gap-3 hover:text-primary">
              <Phone className="h-4 w-4" /> {c.phone}
            </a>
            <a href={`mailto:${c.official_email}`} className="flex items-center gap-3 hover:text-primary">
              <Mail className="h-4 w-4" /> {c.official_email}
            </a>
            <a href={`mailto:${c.author_email}`} className="flex items-center gap-3 hover:text-primary">
              <Mail className="h-4 w-4" /> {c.author_email}
            </a>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
