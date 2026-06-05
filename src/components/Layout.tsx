import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import logoAsset from "@/assets/logo.asset.json";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { label: "About", to: "/about" },
  { label: "Committees", to: "/committees" },
  { label: "Awards", to: "/awards" },
  { label: "Editions", to: "/editions" },
  { label: "FAQ", to: "/faq" },
  { label: "Contact", to: "/contact" },
] as const;

export function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setEmail(s?.user.email ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <img src={logoAsset.url} alt="Kartavyavaadi Group" className="h-10 w-10 rounded" />
          <div className="leading-tight">
            <div className="font-display text-lg font-semibold tracking-tight text-foreground">
              Kartavyavaadi
            </div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              Youth Summit 6.0
            </div>
          </div>
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
              activeProps={{ className: "text-sm font-medium text-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/register"
            className="hidden rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 md:inline-flex"
          >
            Register
          </Link>
          {email ? (
            <Link
              to="/dashboard"
              className="rounded-sm border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/auth"
              className="rounded-sm border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-forest-gradient text-ivory">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <img src={logoAsset.url} alt="" className="h-10 w-10 rounded" />
            <div className="font-display text-2xl">Kartavyavaadi Group</div>
          </div>
          <p className="mt-4 max-w-md font-display text-lg italic text-ivory/80">
            Debate. Diplomacy. Leadership.
          </p>
        </div>
        <div>
          <div className="divider-rule text-ivory/60">Explore</div>
          <ul className="mt-4 space-y-2 text-sm">
            {NAV.map((n) => (
              <li key={n.to}>
                <Link to={n.to} className="text-ivory/80 hover:text-gold">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="divider-rule text-ivory/60">Reach out</div>
          <ul className="mt-4 space-y-2 text-sm text-ivory/80">
            <li>Vansh Wadhawan — Founder President</li>
            <li>+91 93102 70426</li>
            <li>kartavyavaadiaippm@gmail.com</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ivory/10 px-6 py-5 text-center text-xs text-ivory/50">
        © {new Date().getFullYear()} Kartavyavaadi Group. All rights reserved.
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="bg-forest-gradient text-ivory">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        {eyebrow && <div className="divider-rule text-ivory/70">{eyebrow}</div>}
        <h1 className="mt-5 max-w-3xl font-display text-5xl font-medium leading-[1.05] md:text-6xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-5 max-w-2xl text-base text-ivory/75 md:text-lg">{subtitle}</p>
        )}
      </div>
    </section>
  );
}
