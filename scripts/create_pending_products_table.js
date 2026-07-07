const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres:BnLzLMeVg2Hd5EEW@db.dnjarwvhyqyjxunelexs.supabase.co:5432/postgres"
  });
  await client.connect();

  console.log("Connected to database. Creating pending_products table...");

  const ddlQuery = `
    CREATE TABLE IF NOT EXISTS public.pending_products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        checkpoint_name TEXT NOT NULL,
        name TEXT NOT NULL,
        sku TEXT NOT NULL,
        product_name TEXT,
        brand TEXT,
        base_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
        category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
        description TEXT,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        low_stock_threshold INTEGER NOT NULL DEFAULT 5,
        unit_price NUMERIC(12,2),
        store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        confirmed_at TIMESTAMPTZ
    );

    -- Grant proper permissions
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_products TO anon, authenticated, service_role;
  `;

  await client.query(ddlQuery);
  console.log("pending_products table created and permissions granted successfully.");

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
