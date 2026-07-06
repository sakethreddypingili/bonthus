const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function migrate() {
  console.log("Starting missing barcodes migration...");
  
  // 1. Fetch all products
  const { data: products, error: prodError } = await supabase
    .from("products")
    .select("id, name, sku");

  if (prodError) {
    console.error("Failed to fetch products:", prodError);
    process.exit(1);
  }

  console.log(`Fetched ${products.length} products from catalog.`);

  // 2. Fetch all existing barcodes
  const { data: existingBarcodes, error: bcError } = await supabase
    .from("product_barcodes")
    .select("product_id, barcode");

  if (bcError) {
    console.error("Failed to fetch existing barcodes:", bcError);
    process.exit(1);
  }

  const barcodeSet = new Set(existingBarcodes.map(b => b.product_id));
  const usedBarcodeValues = new Set(existingBarcodes.map(b => b.barcode));

  console.log(`Found ${existingBarcodes.length} existing barcode records in database.`);

  const toInsert = [];

  for (const product of products) {
    if (!barcodeSet.has(product.id)) {
      // Generate a unique barcode value
      let newBarcodeVal;
      let isUnique = false;
      let attempts = 0;

      while (!isUnique && attempts < 100) {
        newBarcodeVal = "8901" + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
        if (!usedBarcodeValues.has(newBarcodeVal)) {
          isUnique = true;
          usedBarcodeValues.add(newBarcodeVal);
        }
        attempts++;
      }

      toInsert.push({
        product_id: product.id,
        barcode: newBarcodeVal
      });

      console.log(`[Staged] Product: "${product.name}" (${product.sku}) → Barcode: ${newBarcodeVal}`);
    }
  }

  if (toInsert.length === 0) {
    console.log("All products already have barcodes. No action needed.");
    return;
  }

  console.log(`Inserting ${toInsert.length} missing barcode records into product_barcodes table...`);

  const { data: inserted, error: insertError } = await supabase
    .from("product_barcodes")
    .insert(toInsert)
    .select();

  if (insertError) {
    console.error("Failed to insert missing barcodes:", insertError);
    process.exit(1);
  }

  console.log(`Successfully migrated and generated barcodes for ${inserted.length} products!`);
}

migrate();
