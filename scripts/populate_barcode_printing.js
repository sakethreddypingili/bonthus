const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres:BnLzLMeVg2Hd5EEW@db.dnjarwvhyqyjxunelexs.supabase.co:5432/postgres"
  });
  await client.connect();

  console.log("Creating public.barcode_printing table if it does not exist...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.barcode_printing (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        barcode TEXT,
        model_no TEXT,
        brand TEXT,
        category_name TEXT,
        price NUMERIC(12,2),
        sku TEXT,
        a TEXT,
        b TEXT,
        dbl TEXT,
        tem TEXT,
        status TEXT CHECK (status IN ('pending', 'live')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.barcode_printing TO anon, authenticated, service_role;
  `);
  console.log("Table structure verified.");

  // Clear table first to perform a clean backfill
  await client.query("TRUNCATE public.barcode_printing;");
  console.log("Truncated barcode_printing table.");

  // Fetch all categories to build the parent-most resolution map
  console.log("Fetching all categories for hierarchy mapping...");
  const catRes = await client.query("SELECT id, name, parent_id FROM public.categories;");
  const categoriesMap = new Map();
  for (const cat of catRes.rows) {
    categoriesMap.set(cat.id, cat);
  }

  // Helper function to resolve the parent-most category name
  function getRootCategoryName(categoryId) {
    if (!categoryId) return null;
    let current = categoriesMap.get(categoryId);
    if (!current) return null;
    
    // Climb up the tree until parent_id is null
    while (current.parent_id) {
      const parent = categoriesMap.get(current.parent_id);
      if (!parent) break;
      current = parent;
    }
    return current.name === "frames" ? "Frames" : current.name;
  }

  function getCleanBrand(brand) {
    if (!brand) return null;
    const trimmed = brand.trim();
    if (trimmed.toLowerCase() === "jas harlon") {
      return "Jas Harlan";
    }
    return trimmed;
  }

  let insertCount = 0;

  // 1. Process pending products
  console.log("Fetching pending product barcodes...");
  const pendingBarcodesRes = await client.query(`
    SELECT 
      ppb.barcode, 
      ppb.pending_product_id
    FROM public.pending_product_barcodes ppb;
  `);

  console.log(`Found ${pendingBarcodesRes.rows.length} pending barcodes. Querying details...`);
  for (const barcodeRow of pendingBarcodesRes.rows) {
    if (!barcodeRow.pending_product_id) continue;
    
    const prodRes = await client.query(`
      SELECT brand, base_price, sku, description, category_id
      FROM public.pending_products
      WHERE id = $1
    `, [barcodeRow.pending_product_id]);

    if (prodRes.rows.length === 0) continue;
    const row = prodRes.rows[0];

    let model_no = "";
    let a = "";
    let b = "";
    let dbl = "";
    let tem = "";

    try {
      if (row.description) {
        const desc = JSON.parse(row.description);
        if (desc.type === 'frame') {
          model_no = desc.modelNo || "";
          a = desc.sizeA || "";
          b = desc.sizeB || "";
          dbl = desc.dbl || "";
          tem = desc.templeLength || "";
        }
      }
    } catch (e) {}

    // Resolve parent-most category name
    const rootCategoryName = getRootCategoryName(row.category_id);

    await client.query(`
      INSERT INTO public.barcode_printing (barcode, model_no, brand, category_name, price, sku, a, b, dbl, tem, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      barcodeRow.barcode || null,
      model_no || null,
      getCleanBrand(row.brand),
      rootCategoryName || null,
      row.base_price ? Number(row.base_price) : null,
      row.sku || null,
      a || null,
      b || null,
      dbl || null,
      tem || null,
      'pending'
    ]);
    insertCount++;
  }

  // 2. Process live products
  console.log("Fetching live product barcodes...");
  const liveBarcodesRes = await client.query(`
    SELECT 
      pb.barcode, 
      pb.product_id
    FROM public.product_barcodes pb;
  `);

  console.log(`Found ${liveBarcodesRes.rows.length} live barcodes. Querying details...`);
  for (const barcodeRow of liveBarcodesRes.rows) {
    if (!barcodeRow.product_id) continue;
    
    const prodRes = await client.query(`
      SELECT brand, base_price, sku, description, category_id
      FROM public.products
      WHERE id = $1
    `, [barcodeRow.product_id]);

    if (prodRes.rows.length === 0) continue;
    const row = prodRes.rows[0];

    let model_no = "";
    let a = "";
    let b = "";
    let dbl = "";
    let tem = "";

    try {
      if (row.description) {
        const desc = JSON.parse(row.description);
        if (desc.type === 'frame') {
          model_no = desc.modelNo || "";
          a = desc.sizeA || "";
          b = desc.sizeB || "";
          dbl = desc.dbl || "";
          tem = desc.templeLength || "";
        }
      }
    } catch (e) {}

    // Resolve parent-most category name
    const rootCategoryName = getRootCategoryName(row.category_id);

    await client.query(`
      INSERT INTO public.barcode_printing (barcode, model_no, brand, category_name, price, sku, a, b, dbl, tem, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      barcodeRow.barcode || null,
      model_no || null,
      getCleanBrand(row.brand),
      rootCategoryName || null,
      row.base_price ? Number(row.base_price) : null,
      row.sku || null,
      a || null,
      b || null,
      dbl || null,
      tem || null,
      'live'
    ]);
    insertCount++;
  }

  console.log(`Successfully populated ${insertCount} records in barcode_printing.`);

  // Sample check
  const sampleRes = await client.query(`
    SELECT barcode, model_no, brand, category_name, price, sku, a, b, dbl, tem, status 
    FROM public.barcode_printing 
    LIMIT 15;
  `);
  console.log("\nSample rows in barcode_printing (with root category resolved):");
  console.log(JSON.stringify(sampleRes.rows, null, 2));

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
