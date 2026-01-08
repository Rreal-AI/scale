import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { eq, ilike } from "drizzle-orm";
import { z } from "zod";

// Schema for validating CSV row
const csvRowSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  price: z.number().positive("Price must be positive"),
  weight: z.number().int().positive("Weight must be a positive integer"),
  category: z.string().optional(),
});

type CSVRow = z.infer<typeof csvRowSchema>;

// POST /api/products/import - Import products from CSV
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - User ID required" },
        { status: 401 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: "Forbidden - Organization ID required" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const deleteExisting = formData.get("deleteExisting") === "true";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Read and parse CSV content
    const csvContent = await file.text();
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSV file must have a header row and at least one data row" },
        { status: 400 }
      );
    }

    // Parse header row
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim());
    
    // Validate required columns
    const nameIndex = headers.findIndex(h => h === "name" || h === "nombre" || h === "producto");
    const priceIndex = headers.findIndex(h => h === "price" || h === "precio");
    const weightIndex = headers.findIndex(h => h === "weight" || h === "peso");
    const weightOzIndex = headers.findIndex(h => h === "weight_oz" || h === "peso_oz" || h === "peso oz" || h === "weight oz");
    const categoryIndex = headers.findIndex(h => h === "category" || h === "categoria" || h === "categoría");

    if (nameIndex === -1) {
      return NextResponse.json(
        { error: "CSV must have a 'name' (or 'nombre', 'producto') column" },
        { status: 400 }
      );
    }

    if (priceIndex === -1) {
      return NextResponse.json(
        { error: "CSV must have a 'price' (or 'precio') column" },
        { status: 400 }
      );
    }

    // Must have either weight in grams or weight in oz
    if (weightIndex === -1 && weightOzIndex === -1) {
      return NextResponse.json(
        { error: "CSV must have a 'weight' (or 'peso') column for grams, or 'weight_oz' (or 'peso_oz') column for ounces" },
        { status: 400 }
      );
    }

    // Parse data rows
    const parsedProducts: CSVRow[] = [];
    const errors: { row: number; error: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      
      try {
        const name = values[nameIndex]?.trim();
        const priceStr = values[priceIndex]?.trim().replace(/[$,]/g, "");
        const category = categoryIndex !== -1 ? values[categoryIndex]?.trim() : undefined;

        const price = parseFloat(priceStr);
        
        // Parse weight - can be in grams or ounces
        let weight: number;
        let weightSource: string;
        
        if (weightOzIndex !== -1 && values[weightOzIndex]?.trim()) {
          // Weight in ounces - convert to grams
          const weightOzStr = values[weightOzIndex]?.trim().replace(/[oz,]/gi, "");
          const weightOz = parseFloat(weightOzStr);
          weight = Math.round(weightOz * 28.3495); // Convert oz to grams
          weightSource = `${weightOzStr} oz`;
        } else if (weightIndex !== -1 && values[weightIndex]?.trim()) {
          // Weight in grams - check if it includes "oz" suffix for auto-conversion
          let weightStr = values[weightIndex]?.trim();
          
          if (weightStr.toLowerCase().endsWith("oz")) {
            // Value has oz suffix, convert to grams
            const weightOz = parseFloat(weightStr.replace(/[oz,]/gi, ""));
            weight = Math.round(weightOz * 28.3495);
            weightSource = weightStr;
          } else {
            // Assume grams
            weightStr = weightStr.replace(/[g,]/g, "");
            weight = parseInt(weightStr, 10);
            weightSource = `${weightStr}g`;
          }
        } else {
          errors.push({ row: i + 1, error: "Weight is empty" });
          continue;
        }

        if (!name) {
          errors.push({ row: i + 1, error: "Product name is empty" });
          continue;
        }

        if (isNaN(price) || price <= 0) {
          errors.push({ row: i + 1, error: `Invalid price: ${priceStr}` });
          continue;
        }

        if (isNaN(weight) || weight <= 0) {
          errors.push({ row: i + 1, error: `Invalid weight: ${weightSource}` });
          continue;
        }

        const validatedRow = csvRowSchema.safeParse({
          name,
          price,
          weight,
          category: category || undefined,
        });

        if (!validatedRow.success) {
          errors.push({ row: i + 1, error: validatedRow.error.issues[0]?.message || "Validation error" });
          continue;
        }

        parsedProducts.push(validatedRow.data);
      } catch (err) {
        errors.push({ row: i + 1, error: `Parse error: ${err instanceof Error ? err.message : "Unknown error"}` });
      }
    }

    if (parsedProducts.length === 0) {
      return NextResponse.json(
        { 
          error: "No valid products found in CSV", 
          errors: errors.slice(0, 10) // Limit error details
        },
        { status: 400 }
      );
    }

    // Get or create categories
    const uniqueCategories = [...new Set(parsedProducts.map(p => p.category).filter(Boolean))] as string[];
    const categoryMap = new Map<string, string>(); // category name -> category id

    // Fetch existing categories
    const existingCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.org_id, orgId));

    for (const cat of existingCategories) {
      categoryMap.set(cat.name.toLowerCase(), cat.id);
    }

    // Create missing categories
    for (const categoryName of uniqueCategories) {
      const normalizedName = categoryName.toLowerCase();
      if (!categoryMap.has(normalizedName)) {
        // Check if exists with case-insensitive match
        const existing = existingCategories.find(
          c => c.name.toLowerCase() === normalizedName
        );
        
        if (existing) {
          categoryMap.set(normalizedName, existing.id);
        } else {
          // Create new category
          const [newCategory] = await db
            .insert(categories)
            .values({
              name: categoryName,
              org_id: orgId,
            })
            .returning();
          
          categoryMap.set(normalizedName, newCategory.id);
        }
      }
    }

    // Delete existing products if requested
    let deletedCount = 0;
    if (deleteExisting) {
      const deleted = await db
        .delete(products)
        .where(eq(products.org_id, orgId))
        .returning();
      deletedCount = deleted.length;
    }

    // Insert new products
    const productsToInsert = parsedProducts.map(p => ({
      name: p.name,
      price: Math.round(p.price * 100), // Convert to cents
      weight: p.weight, // Already in grams
      org_id: orgId,
      category_id: p.category ? categoryMap.get(p.category.toLowerCase()) || null : null,
    }));

    const insertedProducts = await db
      .insert(products)
      .values(productsToInsert)
      .returning();

    return NextResponse.json({
      message: "Products imported successfully",
      imported_count: insertedProducts.length,
      deleted_count: deletedCount,
      categories_created: uniqueCategories.filter(c => 
        !existingCategories.some(ec => ec.name.toLowerCase() === c.toLowerCase())
      ).length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      warnings_count: errors.length,
    });
  } catch (error) {
    console.error("Error importing products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to parse CSV line properly (handles quoted fields)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if ((char === "," || char === ";") && !inQuotes) {
      // Field separator
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  
  // Don't forget the last field
  result.push(current);
  
  return result;
}

