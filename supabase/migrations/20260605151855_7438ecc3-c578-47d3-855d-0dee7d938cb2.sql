
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin', 'executive_board', 'delegate');
CREATE TYPE public.chit_type AS ENUM ('POI', 'POO', 'POE', 'POP', 'SUBSTANTIVE', 'REPLY');
CREATE TYPE public.chit_target AS ENUM ('EXECUTIVE_BOARD', 'PORTFOLIO');
CREATE TYPE public.chit_status AS ENUM ('SUBMITTED', 'AI_SCORED', 'FINALIZED', 'REJECTED');
CREATE TYPE public.visibility_mode AS ENUM ('HIDDEN', 'TOTAL_ONLY', 'BREAKDOWN', 'REVEAL_AFTER_END');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles readable by authed users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ============ AUTO-CREATE PROFILE ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'delegate');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ UPDATED_AT HELPER ============
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ SITE CONTENT (CMS) ============
CREATE TABLE public.site_content (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Site content public read" ON public.site_content FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Super admin writes site content" ON public.site_content FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_site_content_updated BEFORE UPDATE ON public.site_content FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ CONFERENCES / COMMITTEES / PORTFOLIOS ============
CREATE TABLE public.conferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  edition TEXT,
  event_date DATE,
  venue TEXT,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.conferences TO anon, authenticated;
GRANT ALL ON public.conferences TO service_role;
ALTER TABLE public.conferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Conferences public read" ON public.conferences FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Super admin manages conferences" ON public.conferences FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id UUID NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_name TEXT,
  agenda TEXT,
  mode TEXT NOT NULL DEFAULT 'OFFLINE',
  fee_inr INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.committees TO anon, authenticated;
GRANT ALL ON public.committees TO service_role;
ALTER TABLE public.committees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Committees public read" ON public.committees FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Super admin manages committees" ON public.committees FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  delegate_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (committee_id, name)
);
GRANT SELECT ON public.portfolios TO anon, authenticated;
GRANT ALL ON public.portfolios TO service_role;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Portfolios public read" ON public.portfolios FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Super admin manages portfolios" ON public.portfolios FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Membership of EB to committees
CREATE TABLE public.committee_eb (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_title TEXT,
  UNIQUE (committee_id, user_id)
);
GRANT SELECT ON public.committee_eb TO authenticated;
GRANT ALL ON public.committee_eb TO service_role;
ALTER TABLE public.committee_eb ENABLE ROW LEVEL SECURITY;
CREATE POLICY "EB membership readable to authed" ON public.committee_eb FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manages eb membership" ON public.committee_eb FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.is_eb_of_committee(_user_id UUID, _committee_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.committee_eb WHERE committee_id = _committee_id AND user_id = _user_id)
    OR public.has_role(_user_id, 'super_admin')
$$;

-- ============ SCORING CRITERIA (per committee) ============
CREATE TABLE public.scoring_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE (committee_id, name)
);
GRANT SELECT ON public.scoring_criteria TO authenticated;
GRANT ALL ON public.scoring_criteria TO service_role;
ALTER TABLE public.scoring_criteria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Criteria readable to authed" ON public.scoring_criteria FOR SELECT TO authenticated USING (true);
CREATE POLICY "EB manages criteria" ON public.scoring_criteria FOR ALL TO authenticated
  USING (public.is_eb_of_committee(auth.uid(), committee_id)) WITH CHECK (public.is_eb_of_committee(auth.uid(), committee_id));

-- ============ SCORE VISIBILITY ============
CREATE TABLE public.score_visibility (
  committee_id UUID PRIMARY KEY REFERENCES public.committees(id) ON DELETE CASCADE,
  mode public.visibility_mode NOT NULL DEFAULT 'HIDDEN',
  reveal_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.score_visibility TO authenticated;
GRANT ALL ON public.score_visibility TO service_role;
ALTER TABLE public.score_visibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visibility readable to authed" ON public.score_visibility FOR SELECT TO authenticated USING (true);
CREATE POLICY "EB sets visibility" ON public.score_visibility FOR ALL TO authenticated
  USING (public.is_eb_of_committee(auth.uid(), committee_id)) WITH CHECK (public.is_eb_of_committee(auth.uid(), committee_id));

-- ============ CHITS ============
CREATE TABLE public.chits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  sender_portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chit_type public.chit_type NOT NULL,
  target_kind public.chit_target NOT NULL,
  target_portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE SET NULL,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  status public.chit_status NOT NULL DEFAULT 'SUBMITTED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chits_committee_created ON public.chits(committee_id, created_at DESC);
CREATE INDEX idx_chits_sender ON public.chits(sender_user_id);
GRANT SELECT, INSERT ON public.chits TO authenticated;
GRANT ALL ON public.chits TO service_role;
ALTER TABLE public.chits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Delegate inserts own chit" ON public.chits FOR INSERT TO authenticated
  WITH CHECK (
    sender_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.portfolios p WHERE p.id = sender_portfolio_id AND p.delegate_user_id = auth.uid() AND p.committee_id = chits.committee_id)
    AND (target_kind = 'EXECUTIVE_BOARD' OR (target_kind = 'PORTFOLIO' AND target_portfolio_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.portfolios tp WHERE tp.id = target_portfolio_id AND tp.committee_id = chits.committee_id)))
  );

CREATE POLICY "Sender or EB read chits" ON public.chits FOR SELECT TO authenticated
  USING (
    sender_user_id = auth.uid()
    OR public.is_eb_of_committee(auth.uid(), committee_id)
    OR (target_kind = 'PORTFOLIO' AND EXISTS (SELECT 1 FROM public.portfolios p WHERE p.id = target_portfolio_id AND p.delegate_user_id = auth.uid()))
  );

-- ============ CHIT SCORES ============
CREATE TABLE public.chit_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chit_id UUID NOT NULL UNIQUE REFERENCES public.chits(id) ON DELETE CASCADE,
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  delegate_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_recommended_score NUMERIC(6,2),
  ai_breakdown JSONB,
  ai_justification TEXT,
  ai_strengths TEXT,
  ai_weaknesses TEXT,
  final_score NUMERIC(6,2),
  final_breakdown JSONB,
  override_reason TEXT,
  finalized_by UUID REFERENCES auth.users(id),
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chit_scores_delegate ON public.chit_scores(delegate_user_id, committee_id);
GRANT SELECT, INSERT, UPDATE ON public.chit_scores TO authenticated;
GRANT ALL ON public.chit_scores TO service_role;
ALTER TABLE public.chit_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "EB read all scores in committee" ON public.chit_scores FOR SELECT TO authenticated
  USING (public.is_eb_of_committee(auth.uid(), committee_id) OR delegate_user_id = auth.uid());

CREATE POLICY "EB write scores" ON public.chit_scores FOR ALL TO authenticated
  USING (public.is_eb_of_committee(auth.uid(), committee_id))
  WITH CHECK (public.is_eb_of_committee(auth.uid(), committee_id));

-- ============ AUDIT LOG ============
CREATE TABLE public.score_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chit_id UUID NOT NULL REFERENCES public.chits(id) ON DELETE CASCADE,
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  evaluator UUID REFERENCES auth.users(id),
  ai_recommended NUMERIC(6,2),
  final_score NUMERIC(6,2),
  override_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.score_audit TO authenticated;
GRANT ALL ON public.score_audit TO service_role;
ALTER TABLE public.score_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "EB and super admin read audit" ON public.score_audit FOR SELECT TO authenticated
  USING (public.is_eb_of_committee(auth.uid(), committee_id));
CREATE POLICY "EB inserts audit" ON public.score_audit FOR INSERT TO authenticated
  WITH CHECK (public.is_eb_of_committee(auth.uid(), committee_id));

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.chits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chit_scores;
