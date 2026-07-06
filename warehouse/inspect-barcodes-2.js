const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  const { data: barcodes } = await supabase
    .from("product_barcodes")
    .select("*")
    .limit(10);
  
  console.log("Sample product_barcodes:", barcodes);
}
inspect();
