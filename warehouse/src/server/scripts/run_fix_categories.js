import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
    const envPath = path.resolve(__dirname, '../../../.env');
    if (!fs.existsSync(envPath)) return {};
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

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function upgrade() {
    console.log(`🔧 Removing strict categories check...`);

    // As a fallback since we cannot use pg-meta direct query, 
    // let's try to do it via an RPC if one exists, or output instructions for the user.
    console.log("Since Supabase REST API doesn't allow raw SQL execution natively, please run the following in your Supabase SQL Editor:");
    console.log(`
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE public.online_products DROP CONSTRAINT IF EXISTS online_products_category_check;
ALTER TABLE public.online_products DROP CONSTRAINT IF EXISTS online_products_category_check1;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_check1;
    `);
}

upgrade();
