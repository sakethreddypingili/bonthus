import { createClient } from '@supabase/supabase-js';
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
const supabaseUrl = env.VITE_SUPABASE_URL || env.REACT_APP_SUPABASE_URL || env.SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    console.log("Supabase URL:", supabaseUrl);
    
    // Query dependents for customer 'Saketh Reddy Pingili' (id: 74f88241-02f5-4bc2-b9f7-c428ac73f701)
    const id = '74f88241-02f5-4bc2-b9f7-c428ac73f701';
    const family_id = '7a57d64a-93f2-4716-bddb-bf22f9b9f546';

    const { data, error } = await supabase
        .from('dependents')
        .select('*')
        .eq('family_id', family_id);

    if (error) {
        console.error("Error querying dependents:", error.message);
    } else {
        console.log("Dependents retrieved via client SDK:", data);
    }
}

run();
