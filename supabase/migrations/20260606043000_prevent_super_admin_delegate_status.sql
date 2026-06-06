-- Super admins should never also be treated as delegates.
-- Clean existing data, then enforce the invariant for future role and portfolio changes.

DELETE FROM public.user_roles ur
WHERE ur.role = 'delegate'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles super_role
    WHERE super_role.user_id = ur.user_id
      AND super_role.role = 'super_admin'
  );

UPDATE public.portfolios p
SET delegate_user_id = NULL
WHERE p.delegate_user_id IN (
  SELECT user_id
  FROM public.user_roles
  WHERE role = 'super_admin'
);

CREATE OR REPLACE FUNCTION public.prevent_super_admin_delegate_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'delegate'
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = NEW.user_id
        AND role = 'super_admin'
        AND id IS DISTINCT FROM NEW.id
    ) THEN
    RAISE EXCEPTION 'Super admins cannot have the delegate role';
  END IF;

  IF NEW.role = 'super_admin' THEN
    DELETE FROM public.user_roles
    WHERE user_id = NEW.user_id
      AND role = 'delegate'
      AND id IS DISTINCT FROM NEW.id;

    UPDATE public.portfolios
    SET delegate_user_id = NULL
    WHERE delegate_user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_super_admin_delegate_status ON public.user_roles;
CREATE TRIGGER prevent_super_admin_delegate_status
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_super_admin_delegate_status();

CREATE OR REPLACE FUNCTION public.prevent_super_admin_portfolio_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.delegate_user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = NEW.delegate_user_id
        AND role = 'super_admin'
    ) THEN
    RAISE EXCEPTION 'Super admins cannot be assigned delegate portfolios';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_super_admin_portfolio_assignment ON public.portfolios;
CREATE TRIGGER prevent_super_admin_portfolio_assignment
BEFORE INSERT OR UPDATE OF delegate_user_id ON public.portfolios
FOR EACH ROW
EXECUTE FUNCTION public.prevent_super_admin_portfolio_assignment();
