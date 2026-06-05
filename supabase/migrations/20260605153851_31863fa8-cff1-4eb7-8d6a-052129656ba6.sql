
ALTER TABLE public.committees ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE;

DROP POLICY IF EXISTS "EB updates own committee" ON public.committees;
CREATE POLICY "EB updates own committee"
ON public.committees
FOR UPDATE
TO authenticated
USING (public.is_eb_of_committee(auth.uid(), id))
WITH CHECK (public.is_eb_of_committee(auth.uid(), id));
