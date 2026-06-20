-- Create transaction function for saving dependents with family linkages
CREATE OR REPLACE FUNCTION public.save_dependent_with_family(
  p_parent_customer_id UUID,
  p_name TEXT,
  p_relationship TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_editing_dep_id UUID DEFAULT NULL,
  p_family_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id UUID;
  v_family_code VARCHAR(50);
  v_parent_phone TEXT;
  v_inserted_dependent dependents;
  v_result JSONB;
BEGIN
  -- Determine family_id. Clean/sanitize empty or invalid inputs to NULL.
  IF p_family_id IS NOT NULL AND p_family_id::text <> '' THEN
    v_family_id := p_family_id;
  ELSE
    SELECT family_id, phone INTO v_family_id, v_parent_phone FROM public.customers WHERE id = p_parent_customer_id;
  END IF;

  -- CRITICAL FIX: Verify if the family record actually exists in public.family table.
  -- This prevents foreign key violations from stale or invalid family_id values in customers.
  IF v_family_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.family WHERE id = v_family_id) THEN
      v_family_id := NULL;
    END IF;
  END IF;

  -- If v_family_id is NULL (or was stale/non-existent), insert the family record FIRST
  IF v_family_id IS NULL THEN
    v_family_code := 'FAM-' || upper(substring(md5(random()::text) from 1 for 8));
    
    INSERT INTO public.family (family_code)
    VALUES (v_family_code)
    RETURNING id INTO v_family_id;

    UPDATE public.customers
    SET family_id = v_family_id
    WHERE id = p_parent_customer_id;
  END IF;

  -- Clean/sanitize phone and email inputs
  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    SELECT phone INTO v_parent_phone FROM public.customers WHERE id = p_parent_customer_id;
    p_phone := v_parent_phone;
  END IF;

  IF p_email IS NULL OR trim(p_email) = '' THEN
    p_email := NULL;
  END IF;

  -- Insert or update the dependent record
  IF p_editing_dep_id IS NOT NULL THEN
    UPDATE public.dependents
    SET 
      name = p_name,
      relationship = p_relationship,
      phone = p_phone,
      email = p_email,
      family_id = v_family_id
    WHERE id = p_editing_dep_id
    RETURNING * INTO v_inserted_dependent;
  ELSE
    INSERT INTO public.dependents (
      parent_customer_id,
      family_id,
      name,
      relationship,
      phone,
      email
    ) VALUES (
      p_parent_customer_id,
      v_family_id,
      p_name,
      p_relationship,
      p_phone,
      p_email
    )
    RETURNING * INTO v_inserted_dependent;
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'dependent', to_jsonb(v_inserted_dependent),
    'family_id', v_family_id
  );
  
  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  -- Any exception automatically rolls back the entire transaction block
  RAISE EXCEPTION '%', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_dependent_with_family(UUID, TEXT, TEXT, TEXT, TEXT, UUID, UUID) TO authenticated, anon;
