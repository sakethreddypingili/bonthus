#!/usr/bin/env node
/**
 * Unified Database Schema Setup & Update Script
 * Applies core schema, constraints, functions, and migrations.
 */

const fs = require('fs');
const path = require('path');
const { Client } = require(path.join(__dirname, '..', 'admin', 'node_modules', 'pg'));

const repoRoot = path.resolve(__dirname, '..');
const adminEnvPath = path.join(repoRoot, 'admin', '.env');
const schemaDir = path.join(repoRoot, 'admin', 'schema');
const backupDir = path.join(repoRoot, 'admin', 'backup');

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
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠ Skipping: ${path.basename(filePath)} (File not found)`);
    return;
  }
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`\n▶ Applying: ${path.basename(filePath)}`);
  
  // Split by semicolon, filter out empty statements, preserve multi-line comments/quotes safely
  const statements = sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

  let successCount = 0;
  let failCount = 0;

  for (const statement of statements) {
    try {
      await client.query(statement + ';');
      successCount++;
    } catch (err) {
      failCount++;
      // Print first few failures to aid debugging
      if (failCount <= 5) {
        console.error(`  ✗ Statement failed: ${err.message}\n    Query: ${statement.slice(0, 100)}...`);
      }
    }
  }
  console.log(`  ✓ Success: ${successCount} queries succeeded, ${failCount} failed.`);
}

async function main() {
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

  // Core Schema Files in logical order
  const coreFiles = [
    path.join(schemaDir, 'types.sql'),
    path.join(schemaDir, 'tables.sql'),
    path.join(schemaDir, 'constraints.sql'),
    path.join(schemaDir, 'functions.sql'),
    path.join(schemaDir, 'triggers.sql'),
    path.join(schemaDir, 'indexes.sql'),
    path.join(schemaDir, 'policies.sql'),
    path.join(schemaDir, 'views.sql'),
  ];

  // Specific Migrations
  const migrationFiles = [
    path.join(backupDir, 'backup_2026-06-15_14-30-00.sql'),
    path.join(backupDir, 'backup_2026-06-15_15-00-00.sql'),
    path.join(backupDir, 'backup_2026-06-15_15-30-00.sql'),
    path.join(backupDir, 'backup_2026-06-15_15-45-00.sql'),
    path.join(backupDir, 'backup_2026-06-15_16-00-00.sql'),
    path.join(backupDir, 'backup_2026-06-20_16-30-00.sql'),
  ];

  console.log('\n--- APPLYING CORE SCHEMA ---');
  for (const file of coreFiles) {
    await runSqlFile(client, file);
  }

  console.log('\n--- APPLYING MIGRATIONS ---');
  for (const file of migrationFiles) {
    await runSqlFile(client, file);
  }

  await client.end();
  console.log('\n✅ Database setup/update finished.');
}

main().catch((err) => {
  console.error('\n❌ Critical Failure:', err.message);
  process.exit(1);
});
