import { db } from "@/db";

async function checkMigrations() {
  try {
    console.log("Checking migration status...");
    
    // Check if drizzle migrations table exists
    const migrationsTableExists = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '__drizzle_migrations'
      );
    `);
    
    console.log("Drizzle migrations table exists:", migrationsTableExists.rows[0]?.exists);
    
    if (migrationsTableExists.rows[0]?.exists) {
      // Get applied migrations
      const appliedMigrations = await db.execute(`
        SELECT id, hash, created_at 
        FROM __drizzle_migrations 
        ORDER BY created_at;
      `);
      
      console.log("\nApplied migrations:");
      appliedMigrations.rows.forEach((row: any) => {
        console.log("-", row.id, "(", row.hash, ") -", row.created_at);
      });
    }
    
  } catch (error) {
    console.error("Error checking migrations:", error);
  }
}

checkMigrations();