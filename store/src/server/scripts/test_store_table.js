import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

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
const anonKey = env.REACT_APP_SUPABASE_ANON_KEY;

async function run() {
    const supabase = createClient(SUPABASE_URL, anonKey);
    
    console.log("Querying stores...");
    const { data: stores, error: storesErr } = await supabase.from('stores').select('*').limit(1);
    console.log("stores result:", stores, "Error:", storesErr);

    console.log("Querying store...");
    const { data: store, error: storeErr } = await supabase.from('store').select('*').limit(1);
    console.log("store result:", store, "Error:", storeErr);
}

run();
