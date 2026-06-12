const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

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

// Helper to format values for insert statements
function formatVal(val) {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
    if (val instanceof Date) return `'${val.toISOString()}'`;
    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
    return val;
}

async function main() {
    console.log(`🔗 Connecting to Supabase database to fetch complete schema...`);
    await client.connect();
    console.log('✅ Connected. Fetching schema metadata...');

    const schemaDir = path.resolve(__dirname, '../../../schema');

    // 1. Fetch Types
    console.log('Fetching types...');
    const typesRes = await client.query(`
        SELECT t.typname AS type_name, e.enumlabel AS enum_value
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
        ORDER BY t.typname, e.enumsortorder;
    `);
    
    let typesSql = `-- TYPES FETCHED FROM LIVE DATABASE\n\n`;
    const typeNames = [...new Set(typesRes.rows.map(r => r.type_name))];
    for (const name of typeNames) {
        const values = typesRes.rows.filter(r => r.type_name === name).map(r => `'${r.enum_value}'`);
        typesSql += `DROP TYPE IF EXISTS public.${name} CASCADE;\n`;
        typesSql += `CREATE TYPE public.${name} AS ENUM (${values.join(', ')});\n\n`;
    }
    const typesPath = path.join(schemaDir, 'types.sql');
    fs.writeFileSync(typesPath, typesSql, 'utf8');
    console.log(`💾 Saved updated types to ${typesPath}`);

    // 2. Fetch Tables and Columns
    console.log('Fetching tables & columns...');
    const columnsRes = await client.query(`
        SELECT table_name, column_name, data_type, is_nullable, column_default, character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
    `);

    // 3. Fetch Constraints
    console.log('Fetching constraints...');
    const constraintsRes = await client.query(`
        SELECT 
            conname AS constraint_name, 
            conrelid::regclass::text AS table_name, 
            pg_get_constraintdef(pg_constraint.oid) AS constraint_definition
        FROM 
            pg_constraint 
        JOIN 
            pg_namespace ON pg_namespace.oid = connamespace 
        WHERE 
            nspname = 'public';
    `);

    // Generate tables.sql (only columns and primary keys inline)
    let tablesSql = `-- TABLES FETCHED FROM LIVE DATABASE\n\n`;
    const tableNames = [...new Set(columnsRes.rows.map(r => r.table_name))];

    for (const tableName of tableNames) {
        tablesSql += `-- -------------------------------------------------------------------------\n`;
        tablesSql += `-- Table: ${tableName}\n`;
        tablesSql += `-- -------------------------------------------------------------------------\n`;
        tablesSql += `CREATE TABLE IF NOT EXISTS public.${tableName} (\n`;

        const cols = columnsRes.rows.filter(r => r.table_name === tableName);
        const colDefinitions = [];

        for (const col of cols) {
            let colDef = `    ${col.column_name} ${col.data_type.toUpperCase()}`;
            if (col.character_maximum_length) {
                colDef += `(${col.character_maximum_length})`;
            }
            if (col.is_nullable === 'NO') {
                colDef += ` NOT NULL`;
            }
            if (col.column_default) {
                colDef += ` DEFAULT ${col.column_default}`;
            }
            colDefinitions.push(colDef);
        }

        // Add primary key constraint inline
        const pkConstraint = constraintsRes.rows.find(c => c.table_name === tableName && c.constraint_definition.startsWith('PRIMARY KEY'));
        if (pkConstraint) {
            colDefinitions.push(`    ${pkConstraint.constraint_definition}`);
        }

        tablesSql += colDefinitions.join(',\n');
        tablesSql += `\n);\n\n`;
    }
    const tablesPath = path.join(schemaDir, 'tables.sql');
    fs.writeFileSync(tablesPath, tablesSql, 'utf8');
    console.log(`💾 Saved updated tables to ${tablesPath}`);

    // Generate constraints.sql (all foreign keys, unique keys, and checks)
    let constraintsSql = `-- CONSTRAINTS FETCHED FROM LIVE DATABASE\n\n`;
    for (const c of constraintsRes.rows) {
        // Skip primary key constraints as we put them in tables.sql
        if (c.constraint_definition.startsWith('PRIMARY KEY')) continue;
        
        // Ensure clean table names (remove public. prefix if any)
        const cleanTableName = c.table_name.replace('public.', '');
        constraintsSql += `ALTER TABLE public.${cleanTableName} DROP CONSTRAINT IF EXISTS "${c.constraint_name}";\n`;
        constraintsSql += `ALTER TABLE public.${cleanTableName} ADD CONSTRAINT "${c.constraint_name}" ${c.constraint_definition};\n\n`;
    }
    const constraintsPath = path.join(schemaDir, 'constraints.sql');
    fs.writeFileSync(constraintsPath, constraintsSql, 'utf8');
    console.log(`💾 Saved updated constraints to ${constraintsPath}`);

    // 4. Fetch Views
    console.log('Fetching views...');
    const viewsRes = await client.query(`
        SELECT viewname AS view_name, definition AS view_definition
        FROM pg_views
        WHERE schemaname = 'public';
    `);
    let viewsSql = `-- VIEWS FETCHED FROM LIVE DATABASE\n\n`;
    for (const v of viewsRes.rows) {
        viewsSql += `-- View: ${v.view_name}\n`;
        viewsSql += `CREATE OR REPLACE VIEW public.${v.view_name} AS\n${v.view_definition};\n\n`;
    }
    const viewsPath = path.join(schemaDir, 'views.sql');
    fs.writeFileSync(viewsPath, viewsSql, 'utf8');
    console.log(`💾 Saved updated views to ${viewsPath}`);

    // 5. Fetch Functions
    console.log('Fetching functions...');
    const functionsRes = await client.query(`
        SELECT p.proname AS name, pg_get_functiondef(p.oid) AS definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.prokind = 'f';
    `);
    let functionsSql = `-- FUNCTIONS FETCHED FROM LIVE DATABASE\n\n`;
    for (const fn of functionsRes.rows) {
        functionsSql += `-- Function: ${fn.name}\n`;
        functionsSql += `${fn.definition};\n\n`;
    }
    const functionsPath = path.join(schemaDir, 'functions.sql');
    fs.writeFileSync(functionsPath, functionsSql, 'utf8');
    console.log(`💾 Saved updated functions to ${functionsPath}`);

    // 6. Fetch Triggers
    console.log('Fetching triggers...');
    const triggersRes = await client.query(`
        SELECT tgname AS trigger_name, relname AS table_name, pg_get_triggerdef(t.oid) AS definition
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND NOT t.tgisinternal;
    `);
    let triggersSql = `-- TRIGGERS FETCHED FROM LIVE DATABASE\n\n`;
    for (const tg of triggersRes.rows) {
        triggersSql += `-- Trigger: ${tg.trigger_name} on ${tg.table_name}\n`;
        triggersSql += `DROP TRIGGER IF EXISTS "${tg.trigger_name}" ON public.${tg.table_name};\n`;
        triggersSql += `${tg.definition};\n\n`;
    }
    const triggersPath = path.join(schemaDir, 'triggers.sql');
    fs.writeFileSync(triggersPath, triggersSql, 'utf8');
    console.log(`💾 Saved updated triggers to ${triggersPath}`);

    // 7. Fetch Policies
    console.log('Fetching policies...');
    const policiesRes = await client.query(`
        SELECT tablename, policyname, cmd, roles, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public';
    `);
    let policiesSql = `-- POLICIES FETCHED FROM LIVE DATABASE\n\n`;
    const tablesWithPolicies = new Set(policiesRes.rows.map(p => p.tablename));
    
    policiesSql += `-- 0. ENABLE ROW LEVEL SECURITY\n`;
    for (const tablename of tablesWithPolicies) {
        policiesSql += `ALTER TABLE public.${tablename} ENABLE ROW LEVEL SECURITY;\n`;
    }
    policiesSql += `\n`;

    for (const tablename of tablesWithPolicies) {
        policiesSql += `-- -------------------------------------------------------------------------\n`;
        policiesSql += `-- Policies for table: ${tablename}\n`;
        policiesSql += `-- -------------------------------------------------------------------------\n`;
        const tablePolicies = policiesRes.rows.filter(p => p.tablename === tablename);
        for (const policy of tablePolicies) {
            policiesSql += `DROP POLICY IF EXISTS "${policy.policyname}" ON public.${tablename};\n`;
            
            let createStmt = `CREATE POLICY "${policy.policyname}" ON public.${tablename}\n`;
            createStmt += `  FOR ${policy.cmd}\n`;
            
            let rolesStr = '';
            if (Array.isArray(policy.roles)) {
                rolesStr = policy.roles.join(', ');
            } else if (typeof policy.roles === 'string') {
                rolesStr = policy.roles.replace(/[{}]/g, '').split(',').map(s => s.trim()).join(', ');
            } else {
                rolesStr = String(policy.roles || 'public');
            }
            
            createStmt += `  TO ${rolesStr}\n`;
            if (policy.qual) {
                createStmt += `  USING (${policy.qual})\n`;
            }
            if (policy.with_check) {
                createStmt += `  WITH CHECK (${policy.with_check})\n`;
            }
            createStmt = createStmt.trim() + ';\n\n';
            policiesSql += createStmt;
        }
    }
    const policiesPath = path.join(schemaDir, 'policies.sql');
    fs.writeFileSync(policiesPath, policiesSql, 'utf8');
    console.log(`💾 Saved updated policies to ${policiesPath}`);

    // 8. Fetch Indexes
    console.log('Fetching indexes...');
    const indexesRes = await client.query(`
        SELECT tablename, indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname NOT LIKE '%_pkey'
          AND indexname NOT LIKE '%_key';
    `);
    let indexesSql = `-- INDEXES FETCHED FROM LIVE DATABASE\n\n`;
    for (const idx of indexesRes.rows) {
        indexesSql += `DROP INDEX IF EXISTS public."${idx.indexname}";\n`;
        indexesSql += `${idx.indexdef};\n\n`;
    }
    const indexesPath = path.join(schemaDir, 'indexes.sql');
    fs.writeFileSync(indexesPath, indexesSql, 'utf8');
    console.log(`💾 Saved updated indexes to ${indexesPath}`);

    // 9. Fetch Storage
    console.log('Fetching storage buckets...');
    let storageSql = `-- STORAGE BUCKETS FETCHED FROM LIVE DATABASE\n\n`;
    try {
        const bucketsRes = await client.query(`
            SELECT id, name, public, avif_autodetection, file_size_limit, allowed_mime_types
            FROM storage.buckets;
        `);
        for (const bucket of bucketsRes.rows) {
            storageSql += `INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)\n`;
            storageSql += `VALUES (${formatVal(bucket.id)}, ${formatVal(bucket.name)}, ${formatVal(bucket.public)}, ${formatVal(bucket.avif_autodetection)}, ${formatVal(bucket.file_size_limit)}, ${formatVal(bucket.allowed_mime_types)})\n`;
            storageSql += `ON CONFLICT (id) DO UPDATE SET\n`;
            storageSql += `  name = EXCLUDED.name,\n`;
            storageSql += `  public = EXCLUDED.public,\n`;
            storageSql += `  avif_autodetection = EXCLUDED.avif_autodetection,\n`;
            storageSql += `  file_size_limit = EXCLUDED.file_size_limit,\n`;
            storageSql += `  allowed_mime_types = EXCLUDED.allowed_mime_types;\n\n`;
        }
    } catch (e) {
        console.warn('⚠️ Could not fetch storage buckets (it may not be enabled or permission denied):', e.message);
    }
    const storagePath = path.join(schemaDir, 'storage.sql');
    fs.writeFileSync(storagePath, storageSql, 'utf8');
    console.log(`💾 Saved updated storage configuration to ${storagePath}`);

    // 10. Fetch Seeds (Dumping lookup tables)
    console.log('Fetching seed data...');
    const seedTables = ['stores', 'users', 'categories', 'product_categories', 'products', 'vendors'];
    let seedsSql = `-- SEEDS FETCHED FROM LIVE DATABASE\n\n`;

    for (const sTable of seedTables) {
        try {
            // Check if table exists first
            const checkTable = await client.query(`SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`, [sTable]);
            if (checkTable.rows.length === 0) continue;

            const rowsRes = await client.query(`SELECT * FROM public.${sTable};`);
            if (rowsRes.rows.length === 0) continue;

            seedsSql += `-- Data for table: public.${sTable}\n`;
            for (const row of rowsRes.rows) {
                const cols = Object.keys(row);
                const vals = Object.values(row).map(formatVal);
                seedsSql += `INSERT INTO public.${sTable} (${cols.join(', ')}) VALUES (${vals.join(', ')}) ON CONFLICT DO NOTHING;\n`;
            }
            seedsSql += `\n`;
        } catch (e) {
            console.warn(`⚠️ Could not fetch seed data for table ${sTable}:`, e.message);
        }
    }
    const seedsPath = path.join(schemaDir, 'seeds.sql');
    fs.writeFileSync(seedsPath, seedsSql, 'utf8');
    console.log(`💾 Saved updated seed data to ${seedsPath}`);

    await client.end();
    console.log('\n✅ Fetch complete and all schema files updated.');
}

main().catch(err => {
    console.error('❌ Error during fetch:', err.message);
    process.exit(1);
});
