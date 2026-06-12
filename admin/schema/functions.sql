-- FUNCTIONS FETCHED FROM LIVE DATABASE

-- Function: handle_auth_user_link
CREATE OR REPLACE FUNCTION public.handle_auth_user_link()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.users
  SET id = NEW.id
  WHERE email = NEW.email;
  RETURN NEW;
END;
$function$
;

-- Function: trigger_set_timestamp
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

-- Function: is_admin_or_super_admin
CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$function$
;

-- Function: auth_user_store_id
CREATE OR REPLACE FUNCTION public.auth_user_store_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT store_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$function$
;

-- Function: auth_user_role
CREATE OR REPLACE FUNCTION public.auth_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$function$
;

