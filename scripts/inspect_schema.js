const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres:BnLzLMeVg2Hd5EEW@db.dnjarwvhyqyjxunelexs.supabase.co:5432/postgres"
  });
  await client.connect();

  console.log("Connected to database. Inspecting table details...");

  // Check columns of products table
  const prodRes = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'products';
  `);
  console.log("\nProducts columns:");
  console.log(prodRes.rows);

  // Check if categories table exists
  const catTableRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name IN ('categories', 'product_categories');
  `);
  console.log("\nAvailable category tables:");
  console.log(catTableRes.rows);

  // Check foreign keys of products
  const fkRes = await client.query(`
    SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
    FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'products';
  `);
  console.log("\nProducts foreign keys:");
  console.log(fkRes.rows);

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
