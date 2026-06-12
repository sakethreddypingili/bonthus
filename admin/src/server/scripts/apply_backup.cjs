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

// Path to backup.sql
const adminSqlPath = path.resolve(__dirname, '../../../backup/backup.sql');

if (!fs.existsSync(adminSqlPath)) {
    console.error(`❌ Error: SQL backup file not found at ${adminSqlPath}`);
    process.exit(1);
}

console.log(`📖 Reading SQL backup from: ${adminSqlPath}`);
const sql = fs.readFileSync(adminSqlPath, 'utf8');

// Connect via pg client using pooler details
const client = new Client({
    host: host,
    port: 5432,
    user: `postgres.${projectRef}`,
    password: DB_PASSWORD,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    console.log(`🔗 Connecting to database at ${host}:5432...`);
    try {
        await client.connect();
        console.log('✅ Connected. Executing SQL backup...');
        await client.query(sql);
        console.log('✅ Database successfully updated with backup.sql schema.');
    } catch (err) {
        console.error('❌ Database update failed:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
