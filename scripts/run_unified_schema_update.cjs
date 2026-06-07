#!/usr/bin/env node
/**
 * Apply SQL migrations to Supabase Postgres (grants, schema, RLS).
 *
 * Usage (from repo root):
 *   node scripts/run_unified_schema_update.cjs
 *   node scripts/run_unified_schema_update.cjs --grants-only
 *   node scripts/run_unified_schema_update.cjs --policies-only
 *
 * Reads admin/.env for SUPABASE_DB_PASSWORD (or POSTGRES_PASSWORD).
 */

const fs = require('fs');
const path = require('path');
const { Client } = require(path.join(__dirname, '..', 'admin', 'node_modules', 'pg'));

const repoRoot = path.resolve(__dirname, '..');
const adminEnvPath = path.join(repoRoot, 'admin', '.env');
const dbDir = path.join(repoRoot, 'admin', 'src', 'server', 'database');

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

async function runSqlFile(client, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`\n▶ ${path.basename(filePath)}`);
  await client.query(sql);
  console.log(`  ✓ ${path.basename(filePath)}`);
}

async function main() {
  const grantsOnly = process.argv.includes('--grants-only');
  const policiesOnly = process.argv.includes('--policies-only');
  const env = loadEnv(adminEnvPath);
  const projectRef = getProjectRef(env);
  const password = env.SUPABASE_DB_PASSWORD || env.POSTGRES_PASSWORD;

  if (!projectRef || !password) {
    console.error('Missing REACT_APP_SUPABASE_URL / SUPABASE_DB_PASSWORD in admin/.env');
    process.exit(1);
  }

  const client = new Client({
    host: 'aws-1-ap-south-1.pooler.supabase.com',
    port: 5432,
    user: `postgres.${projectRef}`,
    password,
    database: env.POSTGRES_DATABASE || 'postgres',
    ssl: { rejectUnauthorized: false },
  });

  console.log(`Connecting to Supabase Postgres (${projectRef})...`);
  await client.connect();

  const files = [];

  if (policiesOnly) {
    for (const name of [
      'users_rls_fix.sql',
      'orders_schema_patch.sql',
      'order_flow_policies.sql',
      'store_inventory_policies.sql',
      'stores_policies.sql',
      'products_policies_fix.sql',
      'invoice_access_policies.sql',
    ]) {
      const file = path.join(dbDir, name);
      if (fs.existsSync(file)) files.push(file);
    }
    if (!files.length) {
      console.error('No policy SQL files found in admin/src/server/database/');
      process.exit(1);
    }
  } else {
    files.push(path.join(dbDir, 'grant_api_access.sql'));
  }

  if (!grantsOnly && !policiesOnly) {
    const optional = [
      path.join(repoRoot, 'bonthus_unified_schema.sql'),
      path.join(dbDir, 'reset_schema.sql'),
    ];
    for (const file of optional) {
      if (fs.existsSync(file)) files.push(file);
    }
    // RLS policies are optional; apply only when explicitly requested
    if (process.argv.includes('--with-rls')) {
      const rls = path.join(dbDir, 'stores_policies.sql');
      if (fs.existsSync(rls)) files.push(rls);
    }
  }

  for (const file of files) {
    await runSqlFile(client, file);
  }

  await client.end();
  console.log('\n✅ Database update finished. Restart admin/store/warehouse dev servers.');
}

main().catch((err) => {
  console.error('\n❌', err.message);
  process.exit(1);
});
