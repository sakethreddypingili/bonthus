const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

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
const DB_PASSWORD = env.SUPABASE_DB_PASSWORD;

if (!SUPABASE_URL || !DB_PASSWORD) {
    console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_DB_PASSWORD in .env');
    process.exit(1);
}

const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];
const host = 'aws-1-ap-south-1.pooler.supabase.com';

const client = new Client({
    host: host,
    port: 5432,
    user: `postgres.${projectRef}`,
    password: DB_PASSWORD,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    console.log(`🔗 Connecting to database at ${host}:5432...`);
    await client.connect();
    console.log('✅ Connected. Performing migration...');

    // 1. Add parent_id column if not exists and drop unique name constraint
    await client.query(`
        ALTER TABLE public.categories 
        ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
        
        ALTER TABLE public.categories 
        DROP CONSTRAINT IF EXISTS categories_name_key;
    `);
    console.log('✅ Added parent_id column and dropped unique categories_name_key constraint.');

    // 2. Ensure root category 'frames' exists with parent_id NULL
    const framesRes = await client.query("SELECT id FROM public.categories WHERE LOWER(name) = 'frames'");
    let framesId;
    if (framesRes.rows.length > 0) {
        framesId = framesRes.rows[0].id;
        await client.query("UPDATE public.categories SET parent_id = NULL WHERE id = $1", [framesId]);
        console.log('✅ Ensured existing "frames" category has parent_id = NULL.');
    } else {
        const insertFrames = await client.query(
            "INSERT INTO public.categories (name, description, parent_id) VALUES ('frames', 'Frame categories', NULL) RETURNING id"
        );
        framesId = insertFrames.rows[0].id;
        console.log('✅ Created root category "frames".');
    }

    // 3. Ensure root category 'lens' exists. If 'lenses' exists, rename it to 'lens'
    const lensesRes = await client.query("SELECT id, name FROM public.categories WHERE LOWER(name) IN ('lenses', 'lens')");
    let lensId;
    const lensesItem = lensesRes.rows.find(r => r.name.toLowerCase() === 'lenses');
    const lensItem = lensesRes.rows.find(r => r.name.toLowerCase() === 'lens');

    if (lensesItem) {
        lensId = lensesItem.id;
        await client.query("UPDATE public.categories SET name = 'lens', parent_id = NULL WHERE id = $1", [lensId]);
        console.log('✅ Renamed existing "lenses" category to "lens" and set parent_id = NULL.');
    } else if (lensItem) {
        lensId = lensItem.id;
        await client.query("UPDATE public.categories SET parent_id = NULL WHERE id = $1", [lensId]);
        console.log('✅ Ensured existing "lens" category has parent_id = NULL.');
    } else {
        const insertLens = await client.query(
            "INSERT INTO public.categories (name, description, parent_id) VALUES ('lens', 'Lens categories', NULL) RETURNING id"
        );
        lensId = insertLens.rows[0].id;
        console.log('✅ Created root category "lens".');
    }

    // Reload PostgREST schema cache
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log("✅ PostgREST schema reloaded.");

    await client.end();
    console.log("🏁 Migration completed successfully.");
}

migrate().catch(err => {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
});
