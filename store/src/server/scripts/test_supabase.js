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
    
    console.log("Querying prescriptions...");
    const { data: pres, error: presErr } = await supabase.from('prescriptions').select('*').limit(1);
    console.log("Prescriptions result:", pres, "Error:", presErr);

    console.log("Querying eye_power...");
    const { data: ep, error: epErr } = await supabase.from('eye_power').select('*').limit(1);
    console.log("Eye_power result:", ep, "Error:", epErr);
}

run();
