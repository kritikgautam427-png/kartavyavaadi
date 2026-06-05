import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout, PageHero } from "@/components/Layout";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getRegistrationUrl } from "./committees";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register — KYS 6.0" },
      { name: "description", content: "Register for UNHRC or Lok Sabha 2026 at KYS 6.0." },
      { property: "og:title", content: "Register — KYS 6.0" },
      { property: "og:description", content: "Limited slots. Secure yours today." },
    ],
  }),
  component: Register,
});

function Register() {
  const [committee, setCommittee] = useState<string>("");

  const { data: committees } = useQuery({
    queryKey: ["public_committees_simple"],
    queryFn: async () => {
      const { data } = await supabase
        .from("committees")
        .select("id, name, fee_inr, mode")
        .order("created_at");
      return data ?? [];
    },
  });

  const selected = committees?.find((c) => c.id === committee);
  const url = getRegistrationUrl(selected?.name);

  return (
    <PublicLayout>
      <PageHero
        eyebrow="Join the Summit"
        title="Register now."
        subtitle="Limited slots available — secure your spot today."
      />
      <section className="mx-auto max-w-2xl px-6 py-20">
        <div className="space-y-6 rounded-sm border border-border bg-card p-8">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pick your committee
            </label>
            <div className="mt-3 space-y-3">
              {committees?.map((c) => (
                <label
                  key={c.id}
                  className={`flex cursor-pointer items-center justify-between rounded-sm border p-4 transition ${
                    committee === c.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  <div>
                    <div className="font-display text-lg font-semibold">{c.name}</div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      {c.mode}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-display text-xl text-primary">
                      ₹{c.fee_inr?.toLocaleString("en-IN")}
                    </span>
                    <input
                      type="radio"
                      name="committee"
                      value={c.id}
                      checked={committee === c.id}
                      onChange={() => setCommittee(c.id)}
                    />
                  </div>
                </label>
              ))}
            </div>
          </div>
          <a
            href={url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!url) e.preventDefault();
            }}
            aria-disabled={!url}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-sm py-4 text-sm font-semibold uppercase tracking-wider ${
              url
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "cursor-not-allowed bg-muted text-muted-foreground"
            }`}
          >
            {url ? (
              <>
                Continue to registration <ExternalLink className="h-4 w-4" />
              </>
            ) : (
              "Select a committee to continue"
            )}
          </a>
          <p className="text-center text-xs text-muted-foreground">
            Registration is handled via a secure Google Form. You'll be redirected.
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}
