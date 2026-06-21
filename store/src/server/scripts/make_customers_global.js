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
-- Drop store_id column from customers table
ALTER TABLE public.customers DROP COLUMN IF EXISTS store_id CASCADE;

-- Update customers RLS policies to be independent of store_id
DROP POLICY IF EXISTS "Users can view customers" ON public.customers;
CREATE POLICY "Users can view customers" ON public.customers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert customers" ON public.customers;
CREATE POLICY "Users can insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update customers" ON public.customers;
CREATE POLICY "Users can update customers" ON public.customers FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can delete customers" ON public.customers;
CREATE POLICY "Users can delete customers" ON public.customers FOR DELETE TO authenticated USING (true);

-- Update prescriptions RLS policies to be independent of store_id
DROP POLICY IF EXISTS "Users can view prescriptions" ON public.prescriptions;
CREATE POLICY "Users can view prescriptions" ON public.prescriptions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert prescriptions" ON public.prescriptions;
CREATE POLICY "Users can insert prescriptions" ON public.prescriptions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update prescriptions" ON public.prescriptions;
CREATE POLICY "Users can update prescriptions" ON public.prescriptions FOR UPDATE TO authenticated USING (true);

-- Create updatable eye_power view linking to prescriptions
CREATE OR REPLACE VIEW public.eye_power AS SELECT * FROM public.prescriptions;
GRANT ALL ON public.eye_power TO authenticated, service_role, anon, postgres;

NOTIFY pgrst, 'reload schema';
`;

async function upgrade() {
    console.log(`🔧 Connecting to Supabase database for project: ${projectRef}...`);
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
        console.log('✅ Database Schema Upgrade Successful.');
    } catch (e) {
        console.error('❌ Error executing SQL:', e.message);
    } finally {
        await client.end();
    }
}

upgrade();
