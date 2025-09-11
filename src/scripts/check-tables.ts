import { db } from "@/db";

async function checkTables() {
  try {
    console.log("Checking existing tables...");
    
    // Query to get all table names
    const result = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log("Existing tables:");
    result.rows.forEach((row: any) => {
      console.log("-", row.table_name);
    });
    
    // Check if rules table exists specifically
    const rulesCheck = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'rules'
      );
    `);
    
    console.log("\nRules table exists:", rulesCheck.rows[0]?.exists);
    
  } catch (error) {
    console.error("Error checking tables:", error);
  }
}

checkTables();