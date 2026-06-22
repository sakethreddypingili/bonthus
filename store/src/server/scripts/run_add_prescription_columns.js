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
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS re_add TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS re_fh TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS re_pb TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS re_a_size TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS re_b_size TEXT;

ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS le_add TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS le_fh TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS le_pb TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS le_a_size TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS le_b_size TEXT;

ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS nv_re_add TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS nv_re_fh TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS nv_re_pb TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS nv_re_a_size TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS nv_re_b_size TEXT;

ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS nv_le_add TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS nv_le_fh TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS nv_le_pb TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS nv_le_a_size TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS nv_le_b_size TEXT;
`;

async function upgrade() {
    console.log(`🔧 Connecting to Supabase database...`);
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
        console.log('✅ Added all dedicated prescription columns for distance and near vision (add, fh, pb, a_size, b_size) to the prescriptions table successfully.');
    } catch (e) {
        console.error('❌ Error executing SQL:', e.message);
    } finally {
        await client.end();
    }
}

upgrade();
