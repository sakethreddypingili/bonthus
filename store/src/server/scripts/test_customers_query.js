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
const anonKey = env.REACT_APP_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

async function run() {
    const supabase = createClient(SUPABASE_URL, anonKey);
    
    console.log("1. Querying with orders(gross_amount)...");
    const { data: d1, error: e1 } = await supabase.from('customers').select('*, orders(gross_amount)').limit(2);
    console.log("Result 1:", d1 ? d1.length : null);
    if (e1) console.error("Error 1:", e1);

    console.log("\n2. Querying with orders(net_amount)...");
    const { data: d2, error: e2 } = await supabase.from('customers').select('*, orders(net_amount)').limit(2);
    console.log("Result 2:", d2 ? d2.length : null);
    if (e2) console.error("Error 2:", e2);

    console.log("\n3. Querying customers without orders relations...");
    const { data: d3, error: e3 } = await supabase.from('customers').select('*').limit(2);
    console.log("Result 3:", d3 ? d3.length : null);
    if (e3) console.error("Error 3:", e3);
}

run();
