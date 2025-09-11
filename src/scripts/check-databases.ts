import { db } from "@/db";

async function checkDatabases() {
  try {
    console.log("Checking available databases...");
    
    // List all databases
    const result = await db.execute(`
      SELECT datname 
      FROM pg_database 
      WHERE datistemplate = false
      ORDER BY datname;
    `);
    
    console.log("Available databases:");
    result.rows.forEach((row: any) => {
      console.log("-", row.datname);
    });
    
    // Check if fs-scale exists
    const fsScaleExists = result.rows.some((row: any) => row.datname === 'fs-scale');
    console.log("\nfs-scale database exists:", fsScaleExists);
    
  } catch (error) {
    console.error("Error checking databases:", error);
  }
}

checkDatabases();