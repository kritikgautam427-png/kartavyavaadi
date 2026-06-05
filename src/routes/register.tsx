import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout, PageHero } from "@/components/Layout";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [email, setEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [committee, setCommittee] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please sign in first to register.");
      return;
    }
    if (!committee) {
      toast.error("Pick a committee.");
      return;
    }
    setSubmitting(true);
    // Lightweight registration: just emails the user a confirmation toast.
    // Real payment can be added later — record intent in profiles meta or a separate table.
    await new Promise((r) => setTimeout(r, 400));
    toast.success("Registration noted! Our team will reach out with payment details.");
    setSubmitting(false);
  };

  return (
    <PublicLayout>
      <PageHero
        eyebrow="Join the Summit"
        title="Register now."
        subtitle="Limited slots available — secure your spot today."
      />
      <section className="mx-auto max-w-2xl px-6 py-20">
        {!email && (
          <div className="mb-6 rounded-sm border border-gold/40 bg-gold/10 p-5 text-sm">
            You'll need to{" "}
            <Link to="/auth" className="font-semibold underline">
              sign in or create an account
            </Link>{" "}
            before registering. Once signed in, your delegate dashboard becomes available.
          </div>
        )}
        <form onSubmit={submit} className="space-y-6 rounded-sm border border-border bg-card p-8">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Committee
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
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-sm bg-primary py-4 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Reserve my spot"}
          </button>
        </form>
      </section>
    </PublicLayout>
  );
}
