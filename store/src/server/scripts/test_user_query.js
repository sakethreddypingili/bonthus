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
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.REACT_APP_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testQuery() {
    // Nisha Mohammad is a store sales rep: nishamohammad11@gmail.com
    console.log("Signing in as nishamohammad11@gmail.com...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'nishamohammad11@gmail.com',
        password: 'Welcome@123'
    });

    if (authError) {
        console.error("Auth error:", authError);
        return;
    }

    console.log("Logged in successfully. User ID:", authData.user.id);

    console.log("Fetching profile from public.users...");
    const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

    console.log("Profile data:", profile);
    console.log("Profile error:", profileErr);

    console.log("Fetching customers from public.customers...");
    const { data: customers, error: custErr } = await supabase
        .from('customers')
        .select('*, orders(net_amount)')
        .is('parent_id', null);

    console.log("Customers count fetched:", customers ? customers.length : 0);
    console.log("Customers error:", custErr);
}

testQuery();
