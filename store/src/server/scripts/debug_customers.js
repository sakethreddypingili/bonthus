import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
    const envPath = path.resolve(__dirname, '../../../.env');
    const env = {};
    if (fs.existsSync(envPath)) {
        fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
            const m = line.match(/^\s*([^#\s=]+)\s*=\s*(.*?)\s*$/);
            if (m) {
                let v = m[2];
                if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
                env[m[1]] = v;
            }
        });
    }
    return env;
}

const env = loadEnv();
const password = env.SUPABASE_DB_PASSWORD;
const SUPABASE_URL = env.VITE_SUPABASE_URL || env.REACT_APP_SUPABASE_URL || env.SUPABASE_URL;
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];

async function debug() {
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
        
        console.log("=== Active RLS Policies on Customers & Users ===");
        const resPolicies = await client.query(`
            SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename IN ('customers', 'users', 'orders')
            ORDER BY tablename, policyname;
        `);
        console.log(resPolicies.rows);

        console.log("\n=== Total counts in tables ===");
        const resCounts = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM public.customers) as customers_count,
                (SELECT COUNT(*) FROM public.users) as users_count,
                (SELECT COUNT(*) FROM public.orders) as orders_count
        `);
        console.log(resCounts.rows[0]);

        console.log("\n=== Sample Users ===");
        const resUsers = await client.query("SELECT id, email, role, store_id FROM public.users LIMIT 5;");
        console.log(resUsers.rows);

        console.log("\n=== Sample Customers (Parent & Store Relation) ===");
        const resCustomers = await client.query("SELECT id, name, phone, parent_id, store_id FROM public.customers LIMIT 5;");
        console.log(resCustomers.rows);

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

debug();
