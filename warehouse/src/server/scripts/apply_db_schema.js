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
const SUPABASE_URL = env.VITE_SUPABASE_URL || env.REACT_APP_SUPABASE_URL || env.SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];
const internalUrl = `https://${projectRef}.supabase.co/pg-meta/v1/query`;

const sqlPath = path.resolve(__dirname, '../server/database/upgrade_orders.sql');
let sql = fs.readFileSync(sqlPath, 'utf8');

// Add the reload schema command
sql += `\nNOTIFY pgrst, 'reload schema';\n`;

async function runSql() {
    console.log('🔗 Connecting to Supabase to run upgrade_orders.sql and reload schema cache...');
    const res = await fetch(internalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({ query: sql }),
    });
    
    if (res.ok) {
        console.log('✅ Database schema updated and cache reloaded successfully.');
    } else {
        console.error('❌ Failed to update schema:', await res.text());
    }
}

runSql();
