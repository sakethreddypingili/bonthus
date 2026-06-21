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

const SQL = fs.readFileSync(path.resolve(__dirname, 'migration_eye_power_created_at.sql'), 'utf8');

async function upgrade() {
    console.log(`🔧 Connecting to Supabase database to execute eye_power view migration...`);
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
        console.log('✅ eye_power view migration completed successfully.');
    } catch (e) {
        console.error('❌ Error executing SQL:', e.message);
    } finally {
        await client.end();
    }
}

upgrade();
