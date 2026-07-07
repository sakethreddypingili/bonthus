const { Client } = require('pg');

function cleanColorName(color) {
  if (!color) return "";
  let clean = color.toUpperCase().trim();
  
  clean = clean.replace(/\bBABAY\b/g, "BABY");
  clean = clean.replace(/\bBALCK\b/g, "BLACK");
  clean = clean.replace(/\bBLACLK\b/g, "BLACK");
  clean = clean.replace(/\bBROUN\b/g, "BROWN");
  clean = clean.replace(/\bROWN\b/g, "BROWN");
  clean = clean.replace(/\bDRAK\b/g, "DARK");
  clean = clean.replace(/\bGREAY\b/g, "GREY");
  clean = clean.replace(/\bMETEL\b/g, "METAL");
  clean = clean.replace(/\bSLIVER\b/g, "SILVER");
  clean = clean.replace(/\bSIVER\b/g, "SILVER");
  clean = clean.replace(/\b(TRANSPRENT|TRANSPRESNT|TRANSPERNT|TRANSPTRENT|TRANSRENT|TRANSPARENT)\b/g, "TRANSPARENT");
  clean = clean.replace(/\bLITE\b/g, "LIGHT");
  clean = clean.replace(/\bMATEE\b/g, "MATTE");
  clean = clean.replace(/\bMEROON\b/g, "MAROON");
  clean = clean.replace(/\bREB\b/g, "RED");
  clean = clean.replace(/\bVOILET\b/g, "VIOLET");
  clean = clean.replace(/\bGREAN\b/g, "GREEN");
  
  clean = clean.replace(/\s*&\s*/g, " & ");
  clean = clean.replace(/\s+/g, " ").trim();
  
  return clean;
}

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
  const isClipOn = row.name && /clip-on/i.test(row.name);
  let brandName = isClipOn ? "Clip On" : (row.brand || "");
  
  let color = "";
  let frameType = "";
  let frameShape = "";

  try {
    if (row.description) {
      const descObj = JSON.parse(row.description);
      if (descObj.type === 'frame') {
        color = cleanColorName(descObj.color || "");
        frameType = descObj.frameType || "";
        frameShape = descObj.frameShape || "";
      }
    }
  } catch (e) {}

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

  console.log("Fetching all pending products to correct spelling in product_name...");
  const res = await client.query(`
    SELECT id, name, brand, description
    FROM pending_products;
  `);

  console.log(`Fetched ${res.rows.length} rows. Updating names...`);
  
  let updatedCount = 0;
  for (const row of res.rows) {
    const productName = computeProductName(row);
    if (productName) {
      let retries = 3;
      while (retries > 0) {
        try {
          await client.query(
            `UPDATE pending_products SET product_name = $1 WHERE id = $2`,
            [productName, row.id]
          );
          updatedCount++;
          break;
        } catch (e) {
          retries--;
          console.error(`Error updating row ${row.id}, retries remaining: ${retries}`, e.message);
          if (retries === 0) throw e;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    if (updatedCount % 100 === 0 && updatedCount > 0) {
      console.log(`Updated ${updatedCount} rows...`);
    }
  }

  console.log(`Successfully updated ${updatedCount} products with corrected spelling.`);

  // Sample check for Drak Greay and Matte Balck
  const sampleRes = await client.query(`
    SELECT name, brand, product_name 
    FROM pending_products 
    WHERE product_name ILIKE '%Dark Grey%' OR product_name ILIKE '%Matte Black%' OR product_name ILIKE '%Clip On%'
    LIMIT 10;
  `);
  console.log("\nSample of corrected rows:");
  console.log(JSON.stringify(sampleRes.rows, null, 2));

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
