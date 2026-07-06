const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  const { data: products } = await supabase
    .from("products")
    .select("id, name, sku, product_barcodes(barcode)");
  
  const missing = products.filter(p => !p.product_barcodes || p.product_barcodes.length === 0);
  console.log(`Total Products: ${products.length}`);
  console.log(`Products without barcodes: ${missing.length}`);
  if (missing.length > 0) {
    console.log("Sample missing:", missing.slice(0, 10));
  }
}
inspect();
