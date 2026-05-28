import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
const SUPABASE_URL = env.VITE_SUPABASE_URL || env.REACT_APP_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ Supabase credentials missing');
    process.exit(1);
}

const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];
const internalUrl = `https://${projectRef}.supabase.co/pg-meta/v1/query`;

const SQL = fs.readFileSync(path.resolve(__dirname, '../server/database/upgrade_orders.sql'), 'utf8');

async function upgrade() {
    console.log(`🔧 Applying DB Upgrade to: ${projectRef}`);
    try {
        const res = await fetch(internalUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
            body: JSON.stringify({ query: SQL }),
        });
        if (res.ok) console.log('✅ DB Upgrade Successful.');
        else console.error('❌ DB Upgrade failed:', await res.text());
    } catch (e) {
        console.error('❌ Error executing SQL:', e.message);
    }
}

upgrade();
