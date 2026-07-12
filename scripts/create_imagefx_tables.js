const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres:BnLzLMeVg2Hd5EEW@db.dnjarwvhyqyjxunelexs.supabase.co:5432/postgres"
  });
  await client.connect();

  console.log("Connected to database. Creating pending_product_images table...");

  const ddlQuery = `
    CREATE TABLE IF NOT EXISTS public.pending_product_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pending_product_id UUID REFERENCES public.pending_products(id) ON DELETE CASCADE UNIQUE,
        image_1 TEXT,
        image_2 TEXT,
        image_3 TEXT,
        image_4 TEXT,
        image_5 TEXT,
        image_6 TEXT,
        image_7 TEXT,
        image_8 TEXT,
        image_9 TEXT,
        image_10 TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Ensure imagefx-uploads storage bucket exists
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('imagefx-uploads', 'imagefx-uploads', true)
    ON CONFLICT (id) DO NOTHING;

    -- Grant proper permissions
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_product_images TO anon, authenticated, service_role;

  `;

  await client.query(ddlQuery);
  console.log("pending_product_images table created and permissions granted successfully.");

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
