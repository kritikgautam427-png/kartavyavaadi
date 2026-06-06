
-- 1. Update bootstrap trigger: no longer auto-grants super_admin to first user,
--    and the admin email vansh_kys_founder@kartavyavaadi.local skips the 'delegate' role.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  -- Admin sentinel account never gets the delegate role
  IF NEW.email = 'vansh_kys_founder@kartavyavaadi.local' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'delegate')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2. Strip ALL existing super_admin / executive_board grants (will be re-granted only to the new seeded admin via server fn)
DELETE FROM public.user_roles WHERE role IN ('super_admin','executive_board');

-- 3. Announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'global', -- 'global' or 'committee'
  committee_id UUID REFERENCES public.committees(id) ON DELETE CASCADE,
  author_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Super admin can manage announcements" ON public.announcements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- 4. Resources (study guides, RoPs, templates)
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general', -- general | study-guide | rop | template
  committee_id UUID REFERENCES public.committees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.resources TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read resources" ON public.resources FOR SELECT USING (true);
CREATE POLICY "Super admin can manage resources" ON public.resources
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- 5. Allow super admin full CRUD on conferences/committees from the app
DROP POLICY IF EXISTS "Super admin manages conferences" ON public.conferences;
CREATE POLICY "Super admin manages conferences" ON public.conferences
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Super admin manages committees" ON public.committees;
CREATE POLICY "Super admin manages committees" ON public.committees
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));
