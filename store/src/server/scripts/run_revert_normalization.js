import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
    const envPath = path.resolve(__dirname, '../../../.env');
    if (!fs.existsSync(envPath)) { console.error('.env not found'); process.exit(1); }
    const env = {};
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
        const m = line.match(/^\s*([^#\s=]+)\s*=\s*(.*?)\s*$/);
        if (m) {
            let v = m[2];
            if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
            env[m[1]] = v;
        }
    });
    return env;
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL || env.REACT_APP_SUPABASE_URL || env.SUPABASE_URL;
const password = env.SUPABASE_DB_PASSWORD;
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];

const SQL = `
BEGIN;

-- 1. Ensure parent_id and relationship columns exist on public.customers
ALTER TABLE public.customers 
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS relationship TEXT,
  ADD COLUMN IF NOT EXISTS age INTEGER;

-- 2. Port existing dependents back to public.customers (defensively using INSERT ON CONFLICT)
-- Note: dependents phone number can be null or empty, if so, we can inherit the parent's phone.
INSERT INTO public.customers (id, name, phone, email, parent_id, relationship, family_id, age, created_at)
SELECT 
    d.id,
    d.name,
    COALESCE(NULLIF(d.phone, ''), p.phone) as phone,
    NULLIF(d.email, '') as email,
    d.parent_customer_id as parent_id,
    d.relationship,
    COALESCE(d.family_id, p.family_id) as family_id,
    d.age,
    d.created_at
FROM public.dependents d
JOIN public.customers p ON d.parent_customer_id = p.id
ON CONFLICT (id) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    relationship = EXCLUDED.relationship,
    family_id = EXCLUDED.family_id,
    age = EXCLUDED.age;

-- 3. Drop dependents table to avoid confusion
DROP TABLE IF EXISTS public.dependents CASCADE;

-- 4. Recreate/Update save_dependent_with_family RPC to work with the unified customers table
-- Instead of public.dependents, it should insert/update in public.customers with parent_id and relationship.
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
  v_inserted_dependent customers;
  v_result JSONB;
BEGIN
  -- Determine family_id. Clean/sanitize empty or invalid inputs to NULL.
  IF p_family_id IS NOT NULL AND p_family_id::text <> '' THEN
    v_family_id := p_family_id;
  ELSE
    SELECT family_id, phone INTO v_family_id, v_parent_phone FROM public.customers WHERE id = p_parent_customer_id;
  END IF;

  -- Verify if the family record actually exists in public.family table.
  IF v_family_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.family WHERE id = v_family_id) THEN
      v_family_id := NULL;
    END IF;
  END IF;

  -- If v_family_id is NULL, insert the family record FIRST
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

  -- Insert or update the dependent record directly inside public.customers
  IF p_editing_dep_id IS NOT NULL THEN
    UPDATE public.customers
    SET 
      name = p_name,
      relationship = p_relationship,
      phone = p_phone,
      email = p_email,
      family_id = v_family_id,
      parent_id = p_parent_customer_id
    WHERE id = p_editing_dep_id
    RETURNING * INTO v_inserted_dependent;
  ELSE
    INSERT INTO public.customers (
      name,
      phone,
      email,
      parent_id,
      relationship,
      family_id
    ) VALUES (
      p_name,
      p_phone,
      p_email,
      p_parent_customer_id,
      p_relationship,
      v_family_id
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
  RAISE EXCEPTION '%', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_dependent_with_family(UUID, TEXT, TEXT, TEXT, TEXT, UUID, UUID) TO authenticated, anon;

-- Re-grant permissions and reload PostgREST schema cache
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
NOTIFY pgrst, 'reload schema';

COMMIT;
`;

async function upgrade() {
    console.log(`🔧 Connecting to Supabase database to execute merge dependents schema migration...`);
    const client = new Client({
        host: 'aws-1-ap-south-1.pooler.supabase.com',
        port: 5432,
        user: `postgres.${projectRef}`,
        password,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        console.log('⚡ Connected. Executing SQL...');
        await client.query(SQL);
        console.log('✅ Dependents merged back into customers table and stored procedure updated successfully.');
    } catch (e) {
        console.error('❌ Error executing SQL:', e.message);
    } finally {
        await client.end();
    }
}

upgrade();
