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
-- Drop existing users select policy and allow any employee (user in users table) to view users
DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()));

-- Drop existing customers select policy and allow any employee (user in users table) to view customers
DROP POLICY IF EXISTS "Users can view customers" ON public.customers;
CREATE POLICY "Users can view customers" ON public.customers FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()));

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
        console.log('✅ RLS Policies updated successfully.');
    } catch (e) {
        console.error('❌ Error executing SQL:', e.message);
    } finally {
        await client.end();
    }
}

upgrade();
