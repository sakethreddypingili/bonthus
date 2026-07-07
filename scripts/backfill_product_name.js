const { Client } = require('pg');

function titleCase(str) {
  if (!str) return "";
  return str
    .toString()
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function computeProductName(row) {
  // Determine if it is a clip-on based on the name
  const isClipOn = row.name && /clip-on/i.test(row.name);
  
  // Rule for Brand
  let brandName = isClipOn ? "Clip On" : (row.brand || "");
  
  let color = "";
  let frameType = "";
  let frameShape = "";

  try {
    if (row.description) {
      const descObj = JSON.parse(row.description);
      if (descObj.type === 'frame') {
        color = descObj.color || "";
        frameType = descObj.frameType || "";
        frameShape = descObj.frameShape || "";
      }
    }
  } catch (e) {
    // If JSON parsing fails, we skip extracting description fields
  }

  // Concatenate parts: brand name + colour + frame type + frame shape
  const parts = [brandName, color, frameType, frameShape]
    .map(p => p.trim())
    .filter(Boolean)
    .map(titleCase);

  return parts.join(" ");
}

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres:BnLzLMeVg2Hd5EEW@db.dnjarwvhyqyjxunelexs.supabase.co:5432/postgres"
  });
  await client.connect();

  console.log("Adding column 'product_name' to 'pending_products' if it does not exist...");
  await client.query(`
    ALTER TABLE public.pending_products 
    ADD COLUMN IF NOT EXISTS product_name TEXT;
  `);

  console.log("Fetching all pending products...");
  const res = await client.query(`
    SELECT id, name, brand, description
    FROM pending_products;
  `);

  console.log(`Fetched ${res.rows.length} rows. Computing product names...`);
  
  let updatedCount = 0;
  for (const row of res.rows) {
    const productName = computeProductName(row);
    if (productName) {
      await client.query(
        `UPDATE pending_products SET product_name = $1 WHERE id = $2`,
        [productName, row.id]
      );
      updatedCount++;
    }
  }

  console.log(`Successfully updated ${updatedCount} pending products with product_name.`);
  
  // Show a sample of updated rows
  const sampleRes = await client.query(`
    SELECT name, brand, product_name 
    FROM pending_products 
    WHERE product_name IS NOT NULL 
    LIMIT 10;
  `);
  console.log("\nSample of updated rows:");
  console.log(JSON.stringify(sampleRes.rows, null, 2));

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
