const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SCHEMA_FILE = path.join(REPO_ROOT, 'bonthus_unified_schema.sql');
const ENV_CANDIDATES = [
  path.join(REPO_ROOT, '.env'),
  path.join(REPO_ROOT, 'admin', '.env'),
  path.join(REPO_ROOT, 'store', '.env'),
  path.join(REPO_ROOT, 'warehouse', '.env'),
];

function parseEnvFile(filePath) {
  const env = {};
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function loadEnv() {
  const combined = { ...process.env };
  for (const envPath of ENV_CANDIDATES) {
    if (!fs.existsSync(envPath)) continue;
    Object.assign(combined, parseEnvFile(envPath));
  }
  return combined;
}

function getProjectRef(supabaseUrl) {
  try {
    const { hostname } = new URL(supabaseUrl);
    return hostname.split('.')[0];
  } catch {
    return null;
  }
}

async function run() {
  if (!fs.existsSync(SCHEMA_FILE)) {
    console.error(`Schema file not found: ${SCHEMA_FILE}`);
    process.exit(1);
  }

  const env = loadEnv();
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || env.REACT_APP_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL (or VITE/REACT_APP variant) and/or SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  const projectRef = getProjectRef(supabaseUrl);
  if (!projectRef) {
    console.error(`Invalid SUPABASE_URL: ${supabaseUrl}`);
    process.exit(1);
  }

  const endpoint = `https://${projectRef}.supabase.co/pg-meta/v1/query`;
  const sql = `${fs.readFileSync(SCHEMA_FILE, 'utf8')}\n\nNOTIFY pgrst, 'reload schema';\n`;

  console.log(`Applying schema from ${SCHEMA_FILE}`);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + serviceRoleKey,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    console.error('Schema update failed:');
    console.error(await response.text());
    process.exit(1);
  }

  console.log('Schema updated successfully.');
}

run().catch((error) => {
  console.error('Unexpected error while updating schema:');
  console.error(error);
  process.exit(1);
});
