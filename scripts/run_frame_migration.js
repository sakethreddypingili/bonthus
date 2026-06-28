#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Client } = require(path.join(__dirname, '..', 'admin', 'node_modules', 'pg'));

const repoRoot = path.resolve(__dirname, '..');
const adminEnvPath = path.join(repoRoot, 'admin', '.env');
const frameMigrationPath = path.join(repoRoot, 'admin', 'schema', 'migration_frame_catalog.sql');
const frameSeedPath = path.join(repoRoot, 'admin', 'schema', 'seed_frame_catalog.sql');

function loadEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  fs.readFileSync(filePath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^\s*([^#\s=]+)\s*=\s*(.*?)\s*$/);
    if (!m) return;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  });
  return env;
}

function getProjectRef(env) {
  const url = env.REACT_APP_SUPABASE_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1];
}

async function main() {
  const env = loadEnv(adminEnvPath);
  const projectRef = getProjectRef(env);
  const password = env.SUPABASE_DB_PASSWORD;

  if (!projectRef || !password) {
    console.error('Missing SUPABASE_URL or SUPABASE_DB_PASSWORD in admin/.env');
    process.exit(1);
  }

  const client = new Client({
    host: 'aws-1-ap-south-1.pooler.supabase.com',
    port: 5432,
    user: `postgres.${projectRef}`,
    password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });

  console.log(`Connecting to Supabase Postgres (${projectRef})...`);
  await client.connect();

  console.log('\n--- RUNNING FRAME CATALOG MIGRATION ---');
  const migrationSql = fs.readFileSync(frameMigrationPath, 'utf8');
  await client.query(migrationSql);
  console.log('✓ Frame migration applied successfully.');

  console.log('\n--- RUNNING FRAME CATALOG SEED ---');
  const seedSql = fs.readFileSync(frameSeedPath, 'utf8');
  await client.query(seedSql);
  console.log('✓ Frame seeds applied successfully.');

  await client.end();
  console.log('\n✅ Frame Catalog database migration & seeding completed successfully.');
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
