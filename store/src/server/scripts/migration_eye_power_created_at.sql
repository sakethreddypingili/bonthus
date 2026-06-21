-- Redefine eye_power view to expose both prescribed_at and created_at
CREATE OR REPLACE VIEW public.eye_power AS 
  SELECT *, prescribed_at AS created_at 
  FROM public.prescriptions;

GRANT ALL ON public.eye_power TO authenticated, service_role, anon, postgres;

NOTIFY pgrst, 'reload schema';
